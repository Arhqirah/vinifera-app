# Vinifera Vinfinder — opsætning

Et lille projekt der lader gæster sige "jeg vil have en frugtig vin til en
romantisk middag" og få konkrete forslag fra Viniferas faktiske sortiment,
med AI-genereret forklaring på hvert valg.

## Arkitektur

```
viniferavin.dk (Shopify)
        ↓  scraper/scrape_vinifera.py  (henter products.json, parser felter)
   MySQL (vinifera_app)
        ↓  scraper/tag_wines.py  (Claude API: udleder smagsprofil + tags)
   MySQL (beriget med sweetness/body/acidity/tannin/fruitiness)
        ↓  backend/app.py  (Flask: filtrerer DB, så Claude forklarer top-valg)
   Next.js frontend (frontend/app/page.tsx)
```

Vigtigt designvalg: **Claude vælger og forklarer kun blandt vine vi allerede
har fundet i databasen.** Den kan ikke opfinde vine eller fakta — det sikrer
at appen aldrig viser noget der ikke rent faktisk findes i butikken.

## 1. Database

```bash
mysql -u root -p < backend/schema.sql
```

## 2. Scraper (kør fra en maskine der kan nå viniferavin.dk)

```bash
cd scraper
pip install requests beautifulsoup4 mysql-connector-python --break-system-packages
# Ret DB_CONFIG i scrape_vinifera.py til dine MySQL-oplysninger
python scrape_vinifera.py
```

Dette henter Viniferas offentlige produkt-feed (samme data som vises på
siden, ingen login nødvendig) og gemmer det struktureret i MySQL.

## 3. Tagging (kræver Anthropic API-nøgle)

```bash
pip install anthropic --break-system-packages
export ANTHROPIC_API_KEY=sk-ant-...
python tag_wines.py
```

Dette beder Claude læse hver vins smagsnote og udlede sødme/fylde/syre/
tannin/frugtighed på en 0-5 skala, samt occasion- og flavor-tags.

## 3b. Datakvalitets-tjek

```bash
python audit_wines.py
```

Tjekker om alle vine har de kernefelter appen regner med (producent, land,
type, pris), om der er udfyldt smagsprofil, og flagger mistænkelige værdier
(f.eks. alkohol% uden for 0-22%, hvilket typisk betyder parseren har grebet
fat i det forkerte tal — fx en pris eller et årstal). Brug `--type Hedvin`
til kun at tjekke en bestemt vintype, da champagne/hedvin/gavekasser kan
have andre feltlayouts end almindelig stillevin.

## 4. Backend

```bash
cd ../backend
pip install flask flask-cors mysql-connector-python anthropic --break-system-packages
# Ret DB_CONFIG i app.py
export ANTHROPIC_API_KEY=sk-ant-...
python app.py
```

Kører på `http://localhost:5000`. Test med:

```bash
curl -X POST http://localhost:5000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{"occasion": "romantisk middag", "flavor": "frugtig"}'
```

## 5. Frontend

```bash
cd ../frontend
npx create-next-app@latest . --typescript --tailwind --app --no-eslint
# (når den spørger om at overskrive filer, behold app/page.tsx som den er)
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm run dev
```

Åbn `http://localhost:3000`.

## Næste skridt / idéer

- Cron-job der re-scraper hver nat så lagerstatus er aktuel
- Filtrér `in_stock` strengere (Shopify viser "midlertidigt udsolgt" som
  separat status — værd at tilføje som egen kolonne)
- Tilføj druetype og land som ekstra filtre i UI
- Cache Claude-svar pr. (occasion, flavor, max_price)-kombination, så samme
  forespørgsel ikke koster en ny API-kald hver gang
