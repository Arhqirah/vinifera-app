-- Vinifera Wine Finder — database schema
-- Mirrors fields visible on viniferavin.dk product pages, plus derived tags for matching

CREATE DATABASE IF NOT EXISTS vinifera_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vinifera_app;

CREATE TABLE wines (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    handle          VARCHAR(255) NOT NULL UNIQUE,   -- Shopify product handle (slug), used as stable external ID
    title           VARCHAR(255) NOT NULL,
    producer        VARCHAR(255),                   -- "Producent"
    country         VARCHAR(100),                   -- "Land"
    region          VARCHAR(150),                   -- "Område"
    subregion       VARCHAR(150),                   -- "Underområde"
    wine_type       VARCHAR(50),                    -- "Type": Rødvin, Hvidvin, Rosé, Mousserende, Champagne, Hedvin...
    grape           VARCHAR(255),                   -- "Druesammensætning"
    food_pairing    TEXT,                           -- "Serveringsforslag" (raw text from site)
    alcohol_pct     DECIMAL(4,1),                   -- "Alkohol"
    bottle_size_cl  INT DEFAULT 75,                 -- "Flaskestørrelse"
    price_dkk       DECIMAL(8,2),
    description     TEXT,                           -- tasting note / body_html, cleaned of HTML
    image_url       VARCHAR(500),
    product_url     VARCHAR(500),
    in_stock        BOOLEAN DEFAULT TRUE,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Derived taste profile (0-5 scale), filled in by the tagging step after scraping
    sweetness       TINYINT,   -- 0 = bone dry, 5 = very sweet
    body            TINYINT,   -- 0 = very light, 5 = very full-bodied
    acidity         TINYINT,   -- 0 = low/soft, 5 = high/crisp
    tannin          TINYINT,   -- 0 = none, 5 = very high (mostly for reds)
    fruitiness      TINYINT,   -- 0 = earthy/savory, 5 = very fruit-forward

    INDEX idx_wine_type (wine_type),
    INDEX idx_country (country),
    INDEX idx_price (price_dkk)
);

-- Free-text tags for occasions and flavor descriptors — many-to-many
CREATE TABLE tags (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    name    VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50)   -- 'occasion', 'flavor', 'food'
);

CREATE TABLE wine_tags (
    wine_id INT NOT NULL,
    tag_id  INT NOT NULL,
    PRIMARY KEY (wine_id, tag_id),
    FOREIGN KEY (wine_id) REFERENCES wines(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Seed common occasion/flavor tags
INSERT INTO tags (name, category) VALUES
    ('hverdag', 'occasion'),
    ('fest', 'occasion'),
    ('gave', 'occasion'),
    ('romantisk middag', 'occasion'),
    ('grillaften', 'occasion'),
    ('aperitif', 'occasion'),
    ('frugtig', 'flavor'),
    ('let', 'flavor'),
    ('fyldig', 'flavor'),
    ('krydret', 'flavor'),
    ('mineralsk', 'flavor'),
    ('sød', 'flavor'),
    ('tør', 'flavor');
