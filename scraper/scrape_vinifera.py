"""
Vinifera scraper
-----------------
Pulls the public Shopify storefront product feed (products.json) from
viniferavin.dk and loads it into the vinifera_app MySQL database.

This works because every Shopify storefront exposes a public, unauthenticated
products.json endpoint by default (this is NOT the admin API — no auth needed,
no API key required). It's the same data shown on the public site.

Run:
    python scrape_vinifera.py

Requires:
    pip install requests mysql-connector-python beautifulsoup4 --break-system-packages
"""

import re
import time
import requests
from bs4 import BeautifulSoup
import mysql.connector

BASE_URL = "https://viniferavin.dk"
PRODUCTS_JSON_URL = f"{BASE_URL}/products.json"
PAGE_LIMIT = 250  # Shopify's max per page

DB_CONFIG = {
    "host": "localhost",
    "port": 3307,
    "user": "vinifera",
    "password": "vinifera123",
    "database": "vinifera_app",
}

# Danish field labels as they appear in product description HTML,
# mapped to our DB column names.
FIELD_MAP = {
    "Producent": "producer",
    "Land": "country",
    "Område": "region",
    "Underområde": "subregion",
    "Type": "wine_type",
    "Druesammensætning": "grape",
    "Serveringsforslag": "food_pairing",
    "Alkohol": "alcohol_pct",
    "Flaskestørrelse": "bottle_size_cl",
}

# Only keep products that are actual wine (skip glasses, openers, gift boxes etc.)
WINE_TYPE_KEYWORDS = [
    "vin", "champagne", "hedvin", "portvin", "mousserende",
    "gin", "whisky", "whiskey", "rom", "vodka", "cognac",
    "armagnac", "brandy", "spiritus", "likør", "bitter", "vermouth",
]


def fetch_all_products():
    """Paginate through products.json and return the raw product dicts."""
    products = []
    page = 1
    while True:
        resp = requests.get(
            PRODUCTS_JSON_URL,
            params={"limit": PAGE_LIMIT, "page": page},
            headers={"User-Agent": "Mozilla/5.0 (compatible; VineFinderBot/1.0)"},
            timeout=15,
        )
        resp.raise_for_status()
        batch = resp.json().get("products", [])
        if not batch:
            break
        products.extend(batch)
        print(f"  fetched page {page}: {len(batch)} products (total so far: {len(products)})")
        page += 1
        time.sleep(0.5)  # be polite to their server
    return products


def parse_structured_fields(body_html: str) -> dict:
    """
    The product description HTML contains lines like:
        Producent: Buller Wines
        Land: Australien
        Område: Victoria
        ...
    This pulls those out into a dict using our FIELD_MAP.
    """
    soup = BeautifulSoup(body_html or "", "html.parser")
    text = soup.get_text("\n")

    result = {}
    for label, col in FIELD_MAP.items():
        # Match "Label: value" anywhere in the text, value ends at newline
        match = re.search(rf"{re.escape(label)}:\s*(.+)", text)
        if match:
            value = match.group(1).strip()
            result[col] = value

    # Clean numeric fields
    if "alcohol_pct" in result:
        m = re.search(r"[\d.,]+", result["alcohol_pct"])
        result["alcohol_pct"] = float(m.group().replace(",", ".")) if m else None

    if "bottle_size_cl" in result:
        m = re.search(r"\d+", result["bottle_size_cl"])
        result["bottle_size_cl"] = int(m.group()) if m else 75

    return result


def get_tasting_note(body_html: str) -> str:
    """
    The first paragraph(s) before the structured fields list is usually
    the actual tasting note / description. We grab text before "Producent:"
    or similar, as a simple heuristic.
    """
    soup = BeautifulSoup(body_html or "", "html.parser")
    text = soup.get_text("\n")
    cutoff = re.search(r"(Producent|Land|Type):", text)
    note = text[: cutoff.start()] if cutoff else text
    return note.strip()


def is_wine(product: dict) -> bool:
    product_type = (product.get("product_type") or "").lower()
    tags = " ".join(product.get("tags") or []).lower()
    title = (product.get("title") or "").lower()
    haystack = f"{product_type} {tags} {title}"
    return any(kw in haystack for kw in WINE_TYPE_KEYWORDS)


def transform(product: dict) -> dict:
    variant = (product.get("variants") or [{}])[0]
    image = (product.get("images") or [{}])[0]
    fields = parse_structured_fields(product.get("body_html", ""))

    return {
        "handle": product["handle"],
        "title": product["title"],
        "producer": fields.get("producer"),
        "country": fields.get("country"),
        "region": fields.get("region"),
        "subregion": fields.get("subregion"),
        "wine_type": fields.get("wine_type"),
        "grape": fields.get("grape"),
        "food_pairing": fields.get("food_pairing"),
        "alcohol_pct": fields.get("alcohol_pct"),
        "bottle_size_cl": fields.get("bottle_size_cl", 75),
        "price_dkk": float(variant.get("price", 0) or 0),
        "description": get_tasting_note(product.get("body_html", "")),
        "image_url": image.get("src"),
        "product_url": f"{BASE_URL}/products/{product['handle']}",
        "in_stock": bool(variant.get("available", False)),
    }


def upsert_wine(cursor, wine: dict):
    columns = list(wine.keys())
    placeholders = ", ".join(["%s"] * len(columns))
    update_clause = ", ".join(f"{c}=VALUES({c})" for c in columns if c != "handle")

    sql = f"""
        INSERT INTO wines ({", ".join(columns)})
        VALUES ({placeholders})
        ON DUPLICATE KEY UPDATE {update_clause}
    """
    cursor.execute(sql, [wine[c] for c in columns])


def main():
    print("Fetching products from Vinifera...")
    raw_products = fetch_all_products()
    print(f"Total products fetched: {len(raw_products)}")

    wines = [transform(p) for p in raw_products if is_wine(p)]
    print(f"Filtered to {len(wines)} wine products")

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    for wine in wines:
        upsert_wine(cursor, wine)

    conn.commit()
    print(f"Saved {len(wines)} wines to database.")
    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
