"""
Data quality audit
-------------------
Run this after scrape_vinifera.py to see which products didn't parse cleanly.
Different product types (champagne, hedvin, danske vine, gift sets) may not
all follow the exact same Danish field-label layout, so this flags gaps
instead of letting them silently become NULLs in the app.

Run:
    python audit_wines.py

Optional:
    python audit_wines.py --type Hedvin       # only audit one wine_type
    python audit_wines.py --show-missing 20   # print up to 20 example rows per issue
"""

import argparse
import mysql.connector

DB_CONFIG = {
    "host": "localhost",
    "port": 3307,
    "user": "vinifera",
    "password": "vinifera123",
    "database": "vinifera_app",
}

# Fields we expect every wine to have. (alcohol_pct can legitimately be NULL
# for a few edge cases like 0% products, so it's checked separately below.)
CORE_FIELDS = ["producer", "country", "wine_type", "price_dkk"]
TASTE_FIELDS = ["sweetness", "body", "acidity", "tannin", "fruitiness"]


def fetch_all(cursor, wine_type_filter=None):
    query = "SELECT * FROM wines"
    params = []
    if wine_type_filter:
        query += " WHERE wine_type = %s"
        params.append(wine_type_filter)
    cursor.execute(query, params)
    return cursor.fetchall()


def audit(wines: list[dict], show_n: int):
    total = len(wines)
    print(f"\nTotal wines in DB: {total}\n")

    if total == 0:
        print("No wines found — did the scraper run successfully?")
        return

    # --- Missing core fields ---
    print("=" * 60)
    print("CORE FIELDS — missing values")
    print("=" * 60)
    for field in CORE_FIELDS:
        missing = [w for w in wines if not w.get(field)]
        pct = 100 * len(missing) / total
        flag = "  ⚠" if pct > 5 else ""
        print(f"  {field:15s} missing: {len(missing):4d} / {total} ({pct:.1f}%){flag}")
        if missing and show_n:
            for w in missing[:show_n]:
                print(f"      - [{w['id']}] {w['title']}  (type: {w.get('wine_type')})")

    # --- Missing taste profile (means tag_wines.py hasn't run on it yet, or failed) ---
    print("\n" + "=" * 60)
    print("TASTE PROFILE — not yet tagged")
    print("=" * 60)
    untagged = [w for w in wines if w.get("sweetness") is None]
    print(f"  {len(untagged)} / {total} wines have no taste profile yet")
    if untagged and show_n:
        for w in untagged[:show_n]:
            print(f"      - [{w['id']}] {w['title']}")

    # --- Suspicious values worth a manual glance ---
    print("\n" + "=" * 60)
    print("SUSPICIOUS VALUES")
    print("=" * 60)

    zero_price = [w for w in wines if w.get("price_dkk") in (0, None)]
    print(f"  Zero or missing price: {len(zero_price)}")
    for w in zero_price[:show_n]:
        print(f"      - [{w['id']}] {w['title']} -> {w.get('price_dkk')}")

    weird_alcohol = [
        w for w in wines
        if w.get("alcohol_pct") is not None and not (0 < float(w["alcohol_pct"]) <= 22)
    ]
    print(f"  Alcohol % outside plausible range (0-22%): {len(weird_alcohol)}")
    for w in weird_alcohol[:show_n]:
        print(f"      - [{w['id']}] {w['title']} -> {w.get('alcohol_pct')}%")

    no_grape = [w for w in wines if not w.get("grape") and w.get("wine_type") not in (None,)]
    print(f"  No grape/druesammensætning listed: {len(no_grape)}")

    # --- Breakdown by wine_type, since different types may parse differently ---
    print("\n" + "=" * 60)
    print("BREAKDOWN BY WINE_TYPE")
    print("=" * 60)
    by_type = {}
    for w in wines:
        key = w.get("wine_type") or "(none)"
        by_type.setdefault(key, []).append(w)

    for wine_type, group in sorted(by_type.items(), key=lambda kv: -len(kv[1])):
        missing_core = sum(
            1 for w in group if any(not w.get(f) for f in CORE_FIELDS)
        )
        print(f"  {wine_type:20s} count={len(group):4d}   with missing core field={missing_core}")

    print("\nDone.\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", dest="wine_type", default=None,
                         help="Only audit wines of this wine_type (e.g. Hedvin)")
    parser.add_argument("--show-missing", dest="show_n", type=int, default=10,
                         help="How many example rows to print per issue (0 to disable)")
    args = parser.parse_args()

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    wines = fetch_all(cursor, args.wine_type)
    audit(wines, args.show_n)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
