"""
Tagging step
------------
For every wine in the DB that doesn't yet have a taste profile, ask Claude
to read the scraped tasting note + grape/type/region and output structured
scores (sweetness, body, acidity, tannin, fruitiness) plus occasion tags.

Uses claude-haiku (cheapest model) and batches 20 wines per API call
so the total cost for 384 wines is well under $0.10.

Run:
    $env:ANTHROPIC_API_KEY="sk-ant-..."
    python tag_wines.py
"""

import os
import json
import mysql.connector
import anthropic

DB_CONFIG = {
    "host": "localhost",
    "port": 3307,
    "user": "vinifera",
    "password": "vinifera123",
    "database": "vinifera_app",
}

BATCH_SIZE = 20

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """Du er en vinekspert. Du modtager en JSON-array med vine. \
For hver vin returnerer du et objekt med disse felter:

{
  "id": <samme id som input>,
  "sweetness": 0-5,
  "body": 0-5,
  "acidity": 0-5,
  "tannin": 0-5,
  "fruitiness": 0-5,
  "occasion_tags": ["tag1"],
  "flavor_tags": ["tag1"]
}

occasion_tags vælges fra: hverdag, fest, gave, romantisk middag, grillaften, aperitif
flavor_tags vælges fra: frugtig, let, fyldig, krydret, mineralsk, sød, tør
tannin skal være 0 for hvidvin/mousserende/rosé.

Svar KUN med en gyldig JSON-array, intet andet."""


def get_untagged_wines(cursor):
    cursor.execute("""
        SELECT id, title, wine_type, grape, region, country, description
        FROM wines
        WHERE sweetness IS NULL
    """)
    return cursor.fetchall()


def tag_batch(wines: list) -> list:
    payload = [
        {
            "id": w["id"],
            "title": w["title"],
            "type": w["wine_type"],
            "grape": w["grape"],
            "region": w["region"],
            "country": w["country"],
            "tasting_note": (w["description"] or "")[:400],
        }
        for w in wines
    ]

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
    )
    text = response.content[0].text.strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)


def get_or_create_tag(cursor, name, category):
    cursor.execute("SELECT id FROM tags WHERE name = %s", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO tags (name, category) VALUES (%s, %s)", (name, category))
    return cursor.lastrowid


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    wines = get_untagged_wines(cursor)
    total = len(wines)
    print(f"Tagging {total} wines in batches of {BATCH_SIZE}...")

    plain_cursor = conn.cursor()
    tagged = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = wines[batch_start: batch_start + BATCH_SIZE]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"  Batch {batch_num}/{total_batches} ({len(batch)} wines)...")

        try:
            results = tag_batch(batch)
        except Exception as e:
            print(f"  FAILED batch {batch_num}: {e}")
            continue

        result_by_id = {r["id"]: r for r in results}

        for wine in batch:
            result = result_by_id.get(wine["id"])
            if not result:
                print(f"    no result for id={wine['id']}, skipping")
                continue

            plain_cursor.execute(
                """UPDATE wines
                   SET sweetness=%s, body=%s, acidity=%s, tannin=%s, fruitiness=%s
                   WHERE id=%s""",
                (result["sweetness"], result["body"], result["acidity"],
                 result["tannin"], result["fruitiness"], wine["id"]),
            )

            for tag_name in result.get("occasion_tags", []):
                tag_id = get_or_create_tag(plain_cursor, tag_name, "occasion")
                plain_cursor.execute(
                    "INSERT IGNORE INTO wine_tags (wine_id, tag_id) VALUES (%s, %s)",
                    (wine["id"], tag_id),
                )

            for tag_name in result.get("flavor_tags", []):
                tag_id = get_or_create_tag(plain_cursor, tag_name, "flavor")
                plain_cursor.execute(
                    "INSERT IGNORE INTO wine_tags (wine_id, tag_id) VALUES (%s, %s)",
                    (wine["id"], tag_id),
                )

            tagged += 1

        conn.commit()
        print(f"    done — {tagged}/{total} tagged so far")

    cursor.close()
    plain_cursor.close()
    conn.close()
    print(f"Done. Tagged {tagged} wines.")


if __name__ == "__main__":
    main()
