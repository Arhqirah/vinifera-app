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
CORS(app)

_ssl_ca = os.environ.get("DB_SSL_CA")
DB_CONFIG = {
    "host":            os.environ.get("DB_HOST", "localhost"),
    "port":            int(os.environ.get("DB_PORT", 3307)),
    "user":            os.environ.get("DB_USER", "vinifera"),
    "password":        os.environ.get("DB_PASSWORD", "vinifera123"),
    "database":        os.environ.get("DB_NAME", "vinifera_app"),
    "connect_timeout": 10,
    **( {"ssl_ca": _ssl_ca, "ssl_verify_cert": True, "ssl_verify_identity": True} if _ssl_ca else {} ),
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


def fetch_candidates(occasion: str, flavor: str, wine_type: str | None, max_price: float | None, exclude_ids: list[int] | None = None):
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
    occasion = data.get("occasion", "")
    flavor = data.get("flavor", "frugtig")
    wine_type = data.get("wine_type")
    max_price = data.get("max_price")
    exclude_ids = data.get("exclude_ids", [])
    language = data.get("language", "da")

    candidates = fetch_candidates(occasion, flavor, wine_type, max_price, exclude_ids)

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


if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
