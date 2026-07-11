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


def get_db():
    return mysql.connector.connect(**DB_CONFIG)


@app.route("/api/wines", methods=["GET"])
def list_wines():
    """Raw filtered search, no AI — useful for testing the DB independently."""
    wine_type = request.args.get("wine_type")
    max_price = request.args.get("max_price", type=float)

    query = "SELECT * FROM wines WHERE in_stock = TRUE"
    params = []
    if wine_type:
        query += " AND wine_type = %s"
        params.append(wine_type)
    if max_price:
        query += " AND price_dkk <= %s"
        params.append(max_price)
    query += " LIMIT 50"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(query, params)
    results = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(results)


@app.route("/api/countries", methods=["GET"])
def list_countries():
    conn   = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT country FROM wines WHERE in_stock = TRUE AND country IS NOT NULL AND country != '' ORDER BY country"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify({"countries": [r[0] for r in rows]})


def fetch_candidates(occasion: str, flavor: str, wine_type: str | None, max_price: float | None, exclude_ids: list[int] | None = None, country: str | None = None):
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

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

    if occasion:
        query += " AND (t.name = %s OR t.name IS NULL)"
        params.append(occasion)
    if wine_type:
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
    if country:
        query += " AND w.country = %s"
        params.append(country)
    if exclude_ids:
        placeholders = ", ".join(["%s"] * len(exclude_ids))
        query += f" AND w.id NOT IN ({placeholders})"
        params.extend(exclude_ids)

    # Order by how well it matches the requested flavor dimension
    column, direction = FLAVOR_TO_COLUMN.get(flavor.lower(), ("fruitiness", "desc"))
    query += f" ORDER BY w.{column} {direction.upper()} LIMIT 8"

    cursor.execute(query, params)
    results = cursor.fetchall()
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
    if country:
        query += " AND country = %s"
        params.append(country)

    query += " ORDER BY title LIMIT 12"

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
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


@app.route("/api/find-on-shelf", methods=["POST"])
def find_on_shelf():
    data = request.get_json(force=True)
    image_b64 = data.get("image")
    image_type = data.get("image_type", "image/jpeg")
    wine_names = data.get("wine_names", [])
    language = data.get("language", "da")

    if not image_b64 or not wine_names:
        return jsonify({"error": "Manglende billede eller vine"}), 400

    names_str = "\n".join(f"- {name}" for name in wine_names)
    if language == "en":
        prompt = (
            f"This is a photo of a wine shelf. The customer is looking for:\n{names_str}\n\n"
            "Can you see any of these wines on the shelf? For each wine you can spot, describe "
            "briefly where it is (e.g. '2nd shelf from top, 4th bottle from left'). "
            "If none are visible, say so kindly."
        )
    else:
        prompt = (
            f"Dette er et billede af en vinhylde. Kunden leder efter:\n{names_str}\n\n"
            "Kan du se nogen af disse vine på hylden? Beskriv kort og præcist hvor hver "
            "synlig vin befinder sig (f.eks. '2. hylde fra toppen, 4. flaske fra venstre'). "
            "Hvis ingen er synlige, sig det venligt."
        )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_type,
                            "data": image_b64,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        return jsonify({"result": response.content[0].text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
