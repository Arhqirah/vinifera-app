"""
Vinifera Wine Finder — Flask backend

Two endpoints:
  GET  /api/wines              -- raw filtered search (no AI), for debugging/admin
  POST /api/recommend           -- the main endpoint the app uses

POST /api/recommend body:
{
  "occasion": "romantisk middag",
  "flavor": "frugtig",
  "wine_type": "rødvin",       // optional
  "max_price": 300              // optional
}

Flow:
  1. Query MySQL for wines matching hard constraints (type, price, in_stock).
  2. Rank candidates by how well their taste profile matches the requested flavor.
  3. Send the top ~8 candidates to Claude, asking it to pick 3 and explain why
     in natural, friendly Danish — grounded ONLY in the data we give it.
  4. Return both the AI explanation and the raw wine data (so the frontend can
     show real prices/images regardless of what the AI says).
"""

import os
import re
import json
import anthropic
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DB_CONFIG = {
    "host":            os.environ.get("DB_HOST", "localhost"),
    "port":            int(os.environ.get("DB_PORT", 3307)),
    "user":            os.environ.get("DB_USER", "vinifera"),
    "password":        os.environ.get("DB_PASSWORD", "vinifera123"),
    "database":        os.environ.get("DB_NAME", "vinifera_app"),
    "connect_timeout": 10,
    "ssl_disabled":    os.environ.get("DB_HOST", "localhost") == "localhost",
}

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

# Maps casual flavor words (English or Danish) to the DB column they relate to,
# and whether high score = high column value.
FLAVOR_TO_COLUMN = {
    "frugtig": ("fruitiness", "desc"),
    "fruity": ("fruitiness", "desc"),
    "let": ("body", "asc"),
    "light": ("body", "asc"),
    "fyldig": ("body", "desc"),
    "full-bodied": ("body", "desc"),
    "tør": ("sweetness", "asc"),
    "dry": ("sweetness", "asc"),
    "sød": ("sweetness", "desc"),
    "sweet": ("sweetness", "desc"),
    "frisk": ("acidity", "desc"),
    "crisp": ("acidity", "desc"),
}

# Maps food-pairing occasions to the wine types that suit them best.
# When one of these occasions is selected, the tag filter is skipped and
# candidates are pre-filtered by these wine types instead.
FOOD_PAIRING_MAP = {
    "sushi":     ["Hvidvin", "Mousserende", "Champagne", "Rosévin"],
    "kød":       ["Rødvin"],
    "vegansk":   ["Hvidvin", "Rosévin", "Mousserende", "Champagne"],
    "skaldyr":   ["Hvidvin", "Mousserende", "Champagne"],
    "pasta":     ["Rødvin", "Hvidvin"],
    "ost":       ["Rødvin", "Hvidvin", "Portvin", "Dessertvin"],
    "vildt":     ["Rødvin"],
    "asiatisk":  ["Hvidvin", "Rosévin", "Mousserende", "Champagne"],
    # English equivalents
    "meat":      ["Rødvin"],
    "vegan":     ["Hvidvin", "Rosévin", "Mousserende", "Champagne"],
    "shellfish": ["Hvidvin", "Mousserende", "Champagne"],
    "cheese":    ["Rødvin", "Hvidvin", "Portvin", "Dessertvin"],
    "game":      ["Rødvin"],
    "asian":     ["Hvidvin", "Rosévin", "Mousserende", "Champagne"],
}


COUNTRY_CANON = {
    "frankrig": "Frankrig",
    "france": "Frankrig",
    "frankrimousg": "Frankrig",
    "frankring": "Frankrig",
    "italien": "Italien",
    "italy": "Italien",
    "i talien": "Italien",
    "spanien": "Spanien",
    "spain": "Spanien",
    "spanie": "Spanien",
    "portugal": "Portugal",
    "tyskland": "Tyskland",
    "germany": "Tyskland",
    "østrig": "Østrig",
    "austria": "Østrig",
    "grækenland": "Grækenland",
    "greece": "Grækenland",
    "australien": "Australien",
    "australia": "Australien",
    "sydafrika": "Sydafrika",
    "south africa": "Sydafrika",
    "new zealand": "New Zealand",
    "usa": "USA",
    "united states": "USA",
    "argentina": "Argentina",
    "chile": "Chile",
    "canada": "Canada",
    "danmark": "Danmark",
    "norge": "Norge",
    "sverige": "Sverige",
    "georgien": "Georgien",
    "georgia": "Georgien",
    "slovenien": "Slovenien",
    "ungarn": "Ungarn",
    "hungary": "Ungarn",
    "den dominikanske republik": "Den Dominikanske Republik",
    "mexico": "Mexico",
    "peru": "Peru",
    "storb ritannien": "Storbritannien",
    "england": "Storbritannien",
    "uk": "Storbritannien",
}


def normalize_country(raw: str) -> str:
    if not raw:
        return ""
    # Remove parenthetical region info: "Frankrig (Languedoc)" → "Frankrig"
    cleaned = re.sub(r'\s*\([^)]*\)', '', raw).strip()
    # Direct full-string match (handles "I talien", "Den Dominikanske Republik")
    direct = COUNTRY_CANON.get(cleaned.lower())
    if direct:
        return direct
    # Try each comma/slash/semicolon-separated part
    # "Bordeaux, Frankrig" → ["Bordeaux", "Frankrig"] → "Frankrig"
    # "Saint-Emillion, Bordeaux, Frankrig" → last part wins
    parts = [p.strip() for p in re.split(r'[,/;]', cleaned) if p.strip()]
    for part in parts:
        canonical = COUNTRY_CANON.get(part.lower())
        if canonical:
            return canonical
    return parts[0] if parts else cleaned


def raw_countries_for(conn, normalized: str) -> list:
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT country FROM wines WHERE country IS NOT NULL AND country != ''")
    result = [r[0] for r in cur.fetchall() if normalize_country(r[0]) == normalized]
    cur.close()
    return result


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


# Auto-migrate: add is_new column if it doesn't exist yet
try:
    _c = get_db(); _cur = _c.cursor()
    _cur.execute("ALTER TABLE wines ADD COLUMN IF NOT EXISTS is_new BOOLEAN DEFAULT FALSE")
    _c.commit(); _cur.close(); _c.close()
except Exception:
    pass

# Data fix: set wine_type = 'Champagne' for wines whose title contains "Champagne"
# but have wine_type = NULL (e.g. Champagne Mandois imported without type)
try:
    _c = get_db(); _cur = _c.cursor()
    _cur.execute(
        "UPDATE wines SET wine_type = 'Champagne' "
        "WHERE wine_type IS NULL AND title LIKE '%Champagne%'"
    )
    _c.commit(); _cur.close(); _c.close()
except Exception:
    pass


@app.route("/api/wines", methods=["GET"])
def list_wines():
    wine_type = request.args.get("wine_type")
    max_price = request.args.get("max_price", type=float)
    country   = request.args.get("country")
    page      = max(1, int(request.args.get("page", 1)))
    per_page  = 24
    offset    = (page - 1) * per_page

    conn = get_db()

    where  = ["in_stock = TRUE"]
    params = []

    if country:
        raw = raw_countries_for(conn, country)
        if raw:
            where.append(f"country IN ({','.join(['%s']*len(raw))})")
            params.extend(raw)
        else:
            where.append("country = %s")
            params.append(country)
    if wine_type:
        where.append("wine_type = %s")
        params.append(wine_type)
    if max_price:
        where.append("price_dkk <= %s")
        params.append(max_price)

    where_sql = "WHERE " + " AND ".join(where)

    count_cur = conn.cursor()
    count_cur.execute(f"SELECT COUNT(*) FROM wines {where_sql}", params)
    total = count_cur.fetchone()[0]
    count_cur.close()

    cur = conn.cursor(dictionary=True)
    cur.execute(
        f"SELECT id, title, producer, country, wine_type, price_dkk, image_url, product_url, sektion, COALESCE(is_new, 0) as is_new FROM wines {where_sql} ORDER BY wine_type, title LIMIT %s OFFSET %s",
        params + [per_page, offset]
    )
    wines = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({"wines": wines, "total": total, "page": page, "per_page": per_page})


@app.route("/api/countries", methods=["GET"])
def list_countries():
    conn   = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT country FROM wines WHERE country IS NOT NULL AND country != ''")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    seen, result = set(), []
    for (raw,) in rows:
        name = normalize_country(raw)
        if name and name not in seen:
            seen.add(name)
            result.append(name)
    return jsonify({"countries": sorted(result)})


def fetch_candidates(occasion: str, flavor: str, wine_type: str | None, max_price: float | None, exclude_ids: list[int] | None = None, country: str | None = None):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    def _run(skip_occasion_tag=False, skip_wine_type=False, skip_country=False):
        query = """
            SELECT DISTINCT w.*
            FROM wines w
            LEFT JOIN wine_tags wt ON w.id = wt.wine_id
            LEFT JOIN tags t ON wt.tag_id = t.id
            WHERE w.in_stock = TRUE
              AND w.wine_type IS NOT NULL
              AND w.wine_type NOT IN ('Øl & vand')
        """
        params = []

        # Always exclude alcohol-free wines unless the user specifically asked for them
        if wine_type != "Alkoholfri":
            query += " AND w.wine_type NOT IN ('Alkoholfri', 'Alkoholreduceret', 'Alkoholfri vin')"

        is_food_pairing = occasion and occasion.lower() in FOOD_PAIRING_MAP
        if not skip_occasion_tag:
            if is_food_pairing and (not wine_type or skip_wine_type):
                pairing_types = FOOD_PAIRING_MAP[occasion.lower()]
                placeholders = ", ".join(["%s"] * len(pairing_types))
                query += f" AND w.wine_type IN ({placeholders})"
                params.extend(pairing_types)
            elif occasion and not is_food_pairing:
                query += " AND (t.name = %s OR t.name IS NULL)"
                params.append(occasion)

        if not skip_wine_type and wine_type:
            if wine_type == "Alkoholfri":
                query += " AND (w.wine_type LIKE '%Alkoholfri%' OR w.wine_type = 'Alkoholreduceret')"
            elif wine_type == "Mousserende":
                query += " AND w.wine_type IN ('Mousserende', 'Champagne', 'Doux')"
            elif wine_type == "Spiritus":
                query += " AND w.wine_type IN ('Cognac', 'Calvados', 'Snaps', 'Rom', 'Vodka', 'Armagnac', 'Grappa', 'Tequila', 'Likør', 'Pastis / Ouzo', 'Bitter', 'Anden spiritus', 'Aperitif', 'Frugtvin')"
            else:
                query += " AND w.wine_type = %s"
                params.append(wine_type)

        if max_price:
            query += " AND w.price_dkk <= %s"
            params.append(max_price)

        if not skip_country and country:
            raw = raw_countries_for(conn, country)
            if raw:
                query += f" AND w.country IN ({', '.join(['%s'] * len(raw))})"
                params.extend(raw)

        if exclude_ids:
            placeholders = ", ".join(["%s"] * len(exclude_ids))
            query += f" AND w.id NOT IN ({placeholders})"
            params.extend(exclude_ids)

        column, direction = FLAVOR_TO_COLUMN.get((flavor or "frugtig").lower(), ("fruitiness", "desc"))
        # COALESCE so wines with NULL scores still appear rather than being silently excluded
        query += f" ORDER BY COALESCE(w.{column}, -1) {direction.upper()} LIMIT 12"
        cursor.execute(query, params)
        return cursor.fetchall()

    # Progressive fallback: relax filters until we get results.
    # Never drop wine_type when the user explicitly selected one — that prevents
    # alcohol-free wines sneaking in when searching for e.g. "sød champagne".
    results = (
        _run() or
        _run(skip_occasion_tag=True) or
        _run(skip_occasion_tag=True, skip_country=True) or
        _run(skip_occasion_tag=True, skip_wine_type=(not wine_type), skip_country=True)
    )

    cursor.close()
    conn.close()
    return results


def ask_claude_to_explain(occasion: str, flavor: str, candidates: list[dict], language: str = "da") -> str:
    """
    Claude only sees the candidates we already fetched from the real DB.
    It is instructed not to invent wines and to pick from the provided list only.
    """
    candidate_summary = [
        {
            "id": w["id"],
            "title": w["title"],
            "type": w["wine_type"],
            "grape": w["grape"],
            "country": w["country"],
            "price_dkk": float(w["price_dkk"]) if w["price_dkk"] else None,
            "fruitiness": w["fruitiness"],
            "body": w["body"],
            "sweetness": w["sweetness"],
            "description": (w["description"] or "")[:200],
        }
        for w in candidates
    ]

    if language == "en":
        system_prompt = """You are a friendly wine advisor at Vinifera in Birkerød, Denmark. \
You receive a customer's request (occasion + flavour preference) and a list of wines from \
the shop's actual inventory. Pick the 3 wines from the list that fit best, and explain \
briefly and warmly in English why — use only information from the list, \
NEVER invent wines or facts not given.

Reply as JSON:
{"picks": [{"id": 1, "reason": "short friendly reason in English"}]}"""
    else:
        system_prompt = """Du er en venlig vinrådgiver hos Vinifera i Birkerød. \
Du får en kundes ønske (anledning + smagspræference) og en liste af vine fra \
butikkens faktiske sortiment. Vælg 3 vine fra listen der passer bedst, og \
forklar kort og varmt på dansk hvorfor — brug kun information fra listen, \
opfind ALDRIG vine eller fakta der ikke er givet.

Svar som JSON:
{"picks": [{"id": 1, "reason": "kort begrundelse på dansk"}]}"""

    user_message = json.dumps({
        "occasion": occasion,
        "flavor": flavor,
        "candidates": candidate_summary,
    }, ensure_ascii=False)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    text = response.content[0].text.strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


@app.route("/api/search", methods=["GET"])
def search_wines():
    q         = request.args.get("q", "").strip()
    wine_type = request.args.get("wine_type")
    max_price = request.args.get("max_price", type=float)
    country   = request.args.get("country")

    if not q:
        return jsonify({"picks": []})

    query  = "SELECT * FROM wines WHERE in_stock = TRUE AND (title LIKE %s OR producer LIKE %s)"
    like   = f"%{q}%"
    params = [like, like]

    if wine_type:
        if wine_type == "Alkoholfri":
            query += " AND (wine_type LIKE '%Alkoholfri%' OR wine_type = 'Alkoholreduceret')"
        elif wine_type == "Mousserende":
            query += " AND wine_type IN ('Mousserende', 'Champagne', 'Doux')"
        elif wine_type == "Spiritus":
            query += " AND wine_type IN ('Cognac', 'Calvados', 'Snaps', 'Rom', 'Vodka', 'Armagnac', 'Grappa', 'Tequila', 'Likør', 'Pastis / Ouzo', 'Bitter', 'Anden spiritus', 'Aperitif', 'Frugtvin')"
        else:
            query += " AND wine_type = %s"
            params.append(wine_type)
    if max_price:
        query += " AND price_dkk <= %s"
        params.append(max_price)
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    if country:
        raw = raw_countries_for(conn, country)
        if raw:
            query += f" AND country IN ({', '.join(['%s'] * len(raw))})"
            params.extend(raw)

    query += " ORDER BY title LIMIT 12"
    cursor.execute(query, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"picks": [{**w, "reason": None} for w in results]})


@app.route("/api/recommend", methods=["POST"])
def recommend():
    data = request.get_json(force=True)
    occasion    = data.get("occasion", "")
    flavor      = data.get("flavor", "frugtig")
    wine_type   = data.get("wine_type")
    max_price   = data.get("max_price")
    exclude_ids = data.get("exclude_ids", [])
    language    = data.get("language", "da")
    country     = data.get("country")

    candidates = fetch_candidates(occasion, flavor, wine_type, max_price, exclude_ids, country)

    if not candidates:
        return jsonify({"picks": [], "message": "Ingen vine matchede dine kriterier."})

    try:
        ai_result = ask_claude_to_explain(occasion, flavor, candidates, language)
    except Exception as e:
        # Fall back to plain DB results if the AI call fails — app still works
        return jsonify({
            "picks": [{**w, "reason": None} for w in candidates[:3]],
            "ai_error": str(e),
        })

    # Merge AI reasons with full wine data from the DB (never trust AI for facts)
    wines_by_id = {w["id"]: w for w in candidates}
    enriched_picks = []
    for pick in ai_result.get("picks", []):
        wine = wines_by_id.get(pick["id"])
        if wine:
            enriched_picks.append({**wine, "reason": pick.get("reason")})

    return jsonify({"picks": enriched_picks})


def ask_claude_similar(reference: dict, candidates: list[dict], language: str = "da") -> dict:
    ref_summary = {
        "title":      reference["title"],
        "type":       reference.get("wine_type"),
        "country":    reference.get("country"),
        "fruitiness": reference.get("fruitiness"),
        "body":       reference.get("body"),
        "sweetness":  reference.get("sweetness"),
        "acidity":    reference.get("acidity"),
        "tannin":     reference.get("tannin"),
        "description": (reference.get("description") or "")[:200],
    }
    candidate_summary = [
        {
            "id":         w["id"],
            "title":      w["title"],
            "type":       w.get("wine_type"),
            "country":    w.get("country"),
            "price_dkk":  float(w["price_dkk"]) if w.get("price_dkk") else None,
            "fruitiness": w.get("fruitiness"),
            "body":       w.get("body"),
            "sweetness":  w.get("sweetness"),
            "acidity":    w.get("acidity"),
            "tannin":     w.get("tannin"),
            "description": (w.get("description") or "")[:200],
        }
        for w in candidates
    ]

    if language == "en":
        system_prompt = (
            "You are a friendly wine advisor at Vinifera in Birkerød, Denmark. "
            "A customer loves a specific wine and wants to find similar ones. "
            "You receive the reference wine and a list of candidates from the shop's actual inventory. "
            "Pick the 3 candidates most similar to the reference wine in style, taste and character. "
            "Write a brief, warm reason in English for each — use only the data given, NEVER invent facts.\n\n"
            'Reply as JSON: {"picks": [{"id": 1, "reason": "short friendly reason"}]}'
        )
    else:
        system_prompt = (
            "Du er en venlig vinrådgiver hos Vinifera i Birkerød. "
            "En kunde er glad for en bestemt vin og vil finde lignende vine. "
            "Du får referencevinen og en liste af kandidater fra butikkens faktiske sortiment. "
            "Vælg de 3 kandidater der minder mest om referencevinen i stil, smag og karakter. "
            "Skriv en kort, varm begrundelse på dansk for hvert valg — brug kun de givne data, opfind ALDRIG fakta.\n\n"
            'Svar som JSON: {"picks": [{"id": 1, "reason": "kort begrundelse på dansk"}]}'
        )

    user_message = json.dumps(
        {"reference_wine": ref_summary, "candidates": candidate_summary},
        ensure_ascii=False,
    )
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}],
    )
    text = response.content[0].text.strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


@app.route("/api/similar", methods=["POST"])
def find_similar():
    data      = request.get_json(force=True)
    wine_name = data.get("wine_name", "").strip()
    max_price = data.get("max_price")
    language  = data.get("language", "da")

    if not wine_name:
        return jsonify({"error": "Manglende vinnavn"}), 400

    conn   = get_db()
    cursor = conn.cursor(dictionary=True)

    # Find reference wine by fuzzy name match
    cursor.execute(
        "SELECT * FROM wines WHERE in_stock = TRUE AND title LIKE %s ORDER BY title LIMIT 1",
        (f"%{wine_name}%",),
    )
    ref = cursor.fetchone()

    if not ref:
        cursor.close()
        conn.close()
        return jsonify({"picks": [], "not_found": True})

    # Euclidean distance on the 5 taste dimensions — default to 3 (mid) when NULL
    rf, rb, rs, ra, rt = (
        ref.get("fruitiness") or 3,
        ref.get("body")       or 3,
        ref.get("sweetness")  or 3,
        ref.get("acidity")    or 3,
        ref.get("tannin")     or 3,
    )

    query = """
        SELECT *,
          (POW(COALESCE(fruitiness, 3) - %s, 2) +
           POW(COALESCE(body,       3) - %s, 2) +
           POW(COALESCE(sweetness,  3) - %s, 2) +
           POW(COALESCE(acidity,    3) - %s, 2) +
           POW(COALESCE(tannin,     3) - %s, 2)) AS distance
        FROM wines
        WHERE in_stock = TRUE
          AND id != %s
          AND wine_type IS NOT NULL
          AND wine_type NOT IN ('Øl & vand')
    """
    params = [rf, rb, rs, ra, rt, ref["id"]]

    if max_price:
        query += " AND price_dkk <= %s"
        params.append(max_price)

    query += " ORDER BY distance ASC LIMIT 8"
    cursor.execute(query, params)
    candidates = cursor.fetchall()
    cursor.close()
    conn.close()

    # Strip the computed distance column before JSON serialisation
    candidates = [{k: v for k, v in w.items() if k != "distance"} for w in candidates]

    if not candidates:
        return jsonify({"picks": [], "reference": {"title": ref["title"]}, "not_found": False})

    try:
        ai_result = ask_claude_similar(ref, candidates, language)
    except Exception as e:
        return jsonify({
            "picks": [{**w, "reason": None} for w in candidates[:3]],
            "reference": {"title": ref["title"]},
            "ai_error": str(e),
        })

    wines_by_id = {w["id"]: w for w in candidates}
    enriched = []
    for pick in ai_result.get("picks", []):
        wine = wines_by_id.get(pick["id"])
        if wine:
            enriched.append({**wine, "reason": pick.get("reason")})

    return jsonify({"picks": enriched, "reference": {"title": ref["title"]}})



@app.route("/api/admin/wines", methods=["GET"])
def admin_list_wines():
    search = request.args.get("q", "").strip()
    sektion = request.args.get("sektion", "").strip()

    wine_type_filter = request.args.get("wine_type_filter", "").strip()
    query = "SELECT id, title, producer, wine_type, country, price_dkk, sektion, COALESCE(is_new, 0) as is_new, sweetness, fruitiness, body, acidity, tannin FROM wines WHERE 1=1"
    params = []
    if search:
        query += " AND (title LIKE %s OR producer LIKE %s)"
        like = f"%{search}%"
        params.extend([like, like])
    if sektion == "__none__":
        query += " AND (sektion IS NULL OR sektion = '')"
    elif sektion:
        query += " AND sektion = %s"
        params.append(sektion)
    if wine_type_filter:
        if wine_type_filter == "Mousserende":
            query += " AND wine_type IN ('Mousserende', 'Champagne', 'Doux')"
        else:
            query += " AND wine_type = %s"
            params.append(wine_type_filter)
    query += " ORDER BY sektion IS NULL DESC, sektion, title LIMIT 300"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    wines = cursor.fetchall()

    cursor.execute("SELECT DISTINCT sektion FROM wines WHERE sektion IS NOT NULL AND sektion != '' ORDER BY sektion")
    sektioner = [r["sektion"] for r in cursor.fetchall()]

    cursor.close()
    conn.close()
    return jsonify({"wines": wines, "sektioner": sektioner})


@app.route("/api/admin/wines/<int:wine_id>", methods=["PATCH"])
def admin_update_sektion(wine_id):
    data = request.get_json(force=True)
    updates, vals = [], []
    if "sektion" in data:
        updates.append("sektion = %s"); vals.append((data.get("sektion") or "").strip() or None)
    if "is_new" in data:
        updates.append("is_new = %s"); vals.append(bool(data["is_new"]))
    if "wine_type" in data:
        updates.append("wine_type = %s"); vals.append(data["wine_type"] or None)
    for col in ("sweetness", "fruitiness", "body", "acidity", "tannin"):
        if col in data:
            v = data[col]
            updates.append(f"{col} = %s"); vals.append(int(v) if v not in (None, "") else None)
    if not updates:
        return jsonify({"ok": True})
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE wines SET {', '.join(updates)} WHERE id = %s", (*vals, wine_id))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
