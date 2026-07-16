-- Migration: tilføj sektion-kolonne til wines tabellen
ALTER TABLE wines ADD COLUMN IF NOT EXISTS sektion VARCHAR(100);

-- Sektion-mapping baseret på hyldebilleder
-- Reol 1 = stor 4-kolonne reol (hovedimod væggen)
-- Reol 2 = 2-kolonne reol til venstre
-- Reol 3 Venstre = spiritus/port/sherry kolonne
-- Reol 3 Højre = champagne/mousserende kolonne
-- Hvid Reol = fritstående hvid reol (rosé, cider)

UPDATE wines SET sektion = 'Reol 3 · Højre · Hylde 2' WHERE title LIKE '%Mandois%';
UPDATE wines SET sektion = 'Reol 3 · Højre · Hylde 2' WHERE title LIKE '%Janisson%';
UPDATE wines SET sektion = 'Reol 3 · Højre · Hylde 3' WHERE title LIKE '%Veuve Clicquot%';
UPDATE wines SET sektion = 'Reol 3 · Højre · Hylde 3' WHERE title LIKE '%Billecart%';
UPDATE wines SET sektion = 'Reol 3 · Højre · Hylde 4' WHERE title LIKE '%Luc Merat%';

UPDATE wines SET sektion = 'Reol 1 · Hylde 2' WHERE title LIKE '%Meyer-Fonné%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 2' WHERE title LIKE '%Bassermann%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 2' WHERE title LIKE '%Weisslacker%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 2' WHERE title LIKE '%Haffenberg%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 2' WHERE title LIKE '%Prager%';

UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Drouhin Vaudon%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Pouilly-Fuissé%' AND producer LIKE '%Drouhin%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Pouilly-Vinzelles%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Puligny-Montrachet%' AND producer LIKE '%Alain%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Meursault%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Mâcon%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Chat Sauvage%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Tramito%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Zorzettig%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Verus%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Renesio%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Sangiovanni%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Planeta Chardonnay%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 3' WHERE title LIKE '%Planeta Terebinto%';

UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Delas%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Château Barateau%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Château Malineau%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%2nd Pez%' OR title LIKE '%de Pez%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Bandol%' AND producer LIKE '%Tempier%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Les Carretas%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Beaujolais-Villages%' AND producer LIKE '%Drouhin%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Fleurie%' AND producer LIKE '%Aviron%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Vacqueyras%' AND producer LIKE '%Delas%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Gigondas%' AND producer LIKE '%Delas%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 4' WHERE title LIKE '%Châteauneuf%' AND producer LIKE '%Delas%';

UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Prunotto%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Barbera d%Alba%' AND producer NOT LIKE '%Vajra%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Parron Anguin%' OR title LIKE '%Paros de Anguix%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Viña Alberdi%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Pingus%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Ninfa%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 5' WHERE title LIKE '%Staida%';

UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Villa Antinori%' AND wine_type = 'Rødvin';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Dolcetto%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Primitivo%' AND producer LIKE '%SUD%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Neprica%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Florao%' OR title LIKE '%Florão%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Earthworks%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%Tilia%';
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%JR Zweigelt%' OR (title LIKE '%Zweigelt%' AND producer LIKE '%JR%');
UPDATE wines SET sektion = 'Reol 1 · Hylde 6' WHERE title LIKE '%JR Pinot Noir%' OR (title LIKE '%Pinot Noir%' AND producer LIKE '%JR%');

UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Solaia%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Guado al Tasso%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Tignanello%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Badia a Passignano%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Marchese Antinori%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 1' WHERE title LIKE '%Pian della Vigna%';

UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%G.D. Vajra%' OR producer LIKE '%Vajra%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Albe Barolo%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Langhe Rosso%' AND producer LIKE '%Vajra%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Bourgogne Aligote%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Auxey-Duresses%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Givry%' AND producer LIKE '%Drouhin%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Fixin%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 2' WHERE title LIKE '%Santenay%';

UPDATE wines SET sektion = 'Reol 2 · Hylde 3' WHERE title LIKE '%Dreissigacker%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 3' WHERE title LIKE '%Spätburgunder%';

UPDATE wines SET sektion = 'Reol 2 · Hylde 4' WHERE title LIKE '%Kistler%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 4' WHERE title LIKE '%Dobbes%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 4' WHERE title LIKE '%Cloudline%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 4' WHERE title LIKE '%Terra.Loci Babilon%';

UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%DAOU%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Terra.Loci Fé%' OR title LIKE '%Terra Loci Fe%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Postals%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Momo%' AND wine_type = 'Hvidvin';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Ara Select%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%rare orange%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Château Simon%';
UPDATE wines SET sektion = 'Reol 2 · Hylde 5' WHERE title LIKE '%Valdeorras%';

UPDATE wines SET sektion = 'Reol 3 · Venstre' WHERE wine_type IN ('Whisky', 'Cognac', 'Calvados', 'Rom', 'Gin', 'Vodka', 'Armagnac', 'Grappa', 'Tequila', 'Likør', 'Pastis / Ouzo', 'Bitter', 'Anden spiritus', 'Aperitif', 'Snaps');
UPDATE wines SET sektion = 'Reol 3 · Venstre' WHERE wine_type IN ('Portvin', 'Hedvin', 'Dessertvin') OR title LIKE '%Graham%' OR title LIKE '%Niepoort%' OR title LIKE '%Lustau%';
UPDATE wines SET sektion = 'Reol 3 · Venstre' WHERE title LIKE '%Walcher%';
UPDATE wines SET sektion = 'Reol 3 · Venstre' WHERE title LIKE '%Vermouth%' OR wine_type = 'Vermouth';

UPDATE wines SET sektion = 'Hvid Reol' WHERE wine_type = 'Rosévin';
UPDATE wines SET sektion = 'Hvid Reol' WHERE wine_type IN ('Cider', 'Frugtvin') AND bottle_size_cl < 75;
