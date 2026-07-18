"use client";

import { useState, useRef, useEffect } from "react";
import {
  Wine, Sparkles, Flower2, GlassWater, Coffee, Gift, Flame,
  Heart, PartyPopper, UtensilsCrossed, Grape, Droplets,
  ArrowRight, ChevronRight, Loader2, ExternalLink, RefreshCw,
  Briefcase, Users, TreePine, Cake, Star, Tv2, Snowflake, Globe,
  Moon, Sun, X, SlidersHorizontal, Share2,
  Fish, Beef, Leaf, Shell, Wheat,
  Milk, Rabbit, Soup,
} from "lucide-react";

type Lang = "da" | "en";
type Theme = "light" | "dark";

const T = {
  da: {
    navLabel:          "Vinfinder",
    heroTitle:         "Find den perfekte vin",
    heroSub:           "Fortæl os anledningen og hvad du er til — vi finder frem til det bedste fra vores sortiment.",
    sectionType:       "Type",
    sectionOccasion:   "Anledning",
    sectionFlavor:     "Smagsprofil",
    sectionSearch:     "Søg på navn (valgfri)",
    searchPlaceholder: "f.eks. Krebs, Château...",
    sectionPrice:      "Maks pris (valgfri)",
    pricePlaceholder:  "f.eks. 250",
    priceUnit:         "DKK",
    findBtn:           "Find vine",
    searching:         "Søger...",
    resultsCount:      (n: number) => `${n} forslag til dig`,
    searchAgain:       "Søg igen",
    loadMore:          "Vis flere vine",
    loadingMore:       "Henter flere...",
    buyBtn:            "Køb i webshoppen",
    recLabel:          "Vores anbefaling",
    noteLabel:         "Smagsnote",
    emptyTitle:        "Ingen vine fundet",
    emptySub:          "Prøv at justere smagsprofilen eller hæv prisgrænsen.",
    errorMsg:          "Kunne ikke hente forslag. Tjek at backend kører.",
    readMore:          "Læs mere",
    readLess:          "Vis mindre",
    footerSub:         "Vinspecialisten i Birkerød",
    sektionLabel:      "Find vinen",
    tasteLabel:        "Smagsprofil",
    tasteKeys:         ["Frugtig", "Krop", "Sødme", "Syre", "Tannin"] as const,
    wineTypes: [
      { label: "Alle",        value: null },
      { label: "Rødvin",      value: "Rødvin" },
      { label: "Hvidvin",     value: "Hvidvin" },
      { label: "Rosévin",     value: "Rosévin" },
      { label: "Mousserende", value: "Mousserende" },
      { label: "Portvin",     value: "Portvin" },
      { label: "Dessertvin",  value: "Dessertvin" },
      { label: "Sherry",      value: "Sherry" },
      { label: "Hedvin",      value: "Hedvin" },
      { label: "Gin",         value: "Gin" },
      { label: "Whisky",      value: "Whisky" },
      { label: "Rom",         value: "Rom" },
      { label: "Spiritus",    value: "Spiritus" },
      { label: "Alkoholfri",  value: "Alkoholfri" },
    ],
    occasions: [
      "Hverdag", "Fest", "Gave", "Romantisk middag", "Grillaften",
      "Aperitif", "Arbejdsmiddag", "Møde", "Fødselsdag",
      "Julefrokost", "Bryllup", "Filmaften", "Picnic",
      "Sushi", "Kød", "Vegansk", "Skaldyr", "Pasta", "Ost", "Vildt", "Asiatisk",
    ],
    flavors: [
      { label: "Ved ikke", desc: "Overrask mig",       key: "overrask" },
      { label: "Frugtig",  desc: "Frisk og bærpræget", key: "frugtig" },
      { label: "Let",      desc: "Delikat og elegant", key: "let" },
      { label: "Fyldig",   desc: "Kraftig og rund",    key: "fyldig" },
      { label: "Tør",      desc: "Ingen restsødme",    key: "tør" },
      { label: "Sød",      desc: "Blød sødme",         key: "sød" },
      { label: "Frisk",    desc: "Sprød syre",         key: "frisk" },
    ],
    pricePresets: [
      { label: "Alle priser", value: "" },
      { label: "Max 100 kr",  value: "100" },
      { label: "Max 200 kr",  value: "200" },
      { label: "Max 400 kr",  value: "400" },
    ],
    refineSearch:       "Tilpas søgning",
    resetFilters:       "Nulstil",
    sectionCountry:     "Land",
    countryAll:         "Alle lande",
    sectionSimilar:     "Find lignende vine",
    similarSub:         "Kender du en vin du er glad for? Skriv navnet og vi finder vine der minder om den.",
    similarPlaceholder: "f.eks. Barolo, Sancerre, Krebs...",
    similarBtn:         "Find lignende",
    similarSearching:   "Søger...",
    similarRef:         (name: string) => `Vine der minder om "${name}"`,
    similarNotFound:    "Vinen blev ikke fundet i sortimentet.",
    similarNotFoundSub: "Prøv et andet navn, eller brug navnesøgningen ovenfor.",
    shareBtn:           "Del søgning",
    shareCopied:        "Link kopieret!",
    favTitle:           "Mine favoritter",
    favEmpty:           "Du har ikke gemt nogen vine endnu. Klik ❤️ på en vin for at gemme den.",
    newBadge:           "Ny",
  },
  en: {
    navLabel:          "Wine Finder",
    heroTitle:         "Find the perfect wine",
    heroSub:           "Tell us the occasion and what you're in the mood for — we'll find the best from our selection.",
    sectionType:       "Type",
    sectionOccasion:   "Occasion",
    sectionFlavor:     "Flavor profile",
    sectionSearch:     "Search by name (optional)",
    searchPlaceholder: "e.g. Krebs, Château...",
    sectionPrice:      "Max price (optional)",
    pricePlaceholder:  "e.g. 250",
    priceUnit:         "DKK",
    findBtn:           "Find wines",
    searching:         "Searching...",
    resultsCount:      (n: number) => `${n} suggestion${n !== 1 ? "s" : ""} for you`,
    searchAgain:       "Search again",
    loadMore:          "Show more wines",
    loadingMore:       "Loading more...",
    buyBtn:            "Buy in the webshop",
    recLabel:          "Our recommendation",
    noteLabel:         "Tasting note",
    emptyTitle:        "No wines found",
    emptySub:          "Try adjusting the flavor profile or increasing the price limit.",
    errorMsg:          "Could not fetch suggestions. Check that the backend is running.",
    readMore:          "Read more",
    readLess:          "Show less",
    footerSub:         "Wine specialist in Birkerød",
    sektionLabel:      "Find the wine",
    tasteLabel:        "Taste profile",
    tasteKeys:         ["Fruity", "Body", "Sweetness", "Acidity", "Tannin"] as const,
    wineTypes: [
      { label: "All",           value: null },
      { label: "Red wine",      value: "Rødvin" },
      { label: "White wine",    value: "Hvidvin" },
      { label: "Rosé",          value: "Rosévin" },
      { label: "Sparkling",     value: "Mousserende" },
      { label: "Port wine",     value: "Portvin" },
      { label: "Dessert wine",  value: "Dessertvin" },
      { label: "Sherry",        value: "Sherry" },
      { label: "Fortified",     value: "Hedvin" },
      { label: "Gin",           value: "Gin" },
      { label: "Whisky",        value: "Whisky" },
      { label: "Rum",           value: "Rom" },
      { label: "Spirits",       value: "Spiritus" },
      { label: "Alcohol-free",  value: "Alkoholfri" },
    ],
    occasions: [
      "Everyday", "Party", "Gift", "Romantic dinner", "BBQ night",
      "Aperitif", "Business lunch", "Meeting", "Birthday",
      "Christmas lunch", "Wedding", "Movie night", "Picnic",
      "Sushi", "Meat", "Vegan", "Shellfish", "Pasta", "Cheese", "Game", "Asian",
    ],
    flavors: [
      { label: "Not sure",    desc: "Surprise me",             key: "overrask" },
      { label: "Fruity",      desc: "Fresh and berry-forward", key: "frugtig" },
      { label: "Light",       desc: "Delicate and elegant",    key: "let" },
      { label: "Full-bodied", desc: "Rich and round",          key: "fyldig" },
      { label: "Dry",         desc: "No residual sweetness",   key: "tør" },
      { label: "Sweet",       desc: "Soft sweetness",          key: "sød" },
      { label: "Crisp",       desc: "Vibrant acidity",         key: "frisk" },
    ],
    pricePresets: [
      { label: "Any price",  value: "" },
      { label: "Max 100 kr", value: "100" },
      { label: "Max 200 kr", value: "200" },
      { label: "Max 400 kr", value: "400" },
    ],
    refineSearch:       "Refine search",
    resetFilters:       "Reset",
    sectionCountry:     "Country",
    countryAll:         "All countries",
    sectionSimilar:     "Find similar wines",
    similarSub:         "Know a wine you love? Enter its name and we'll find wines that taste like it.",
    similarPlaceholder: "e.g. Barolo, Sancerre, Krebs...",
    similarBtn:         "Find similar",
    similarSearching:   "Searching...",
    similarRef:         (name: string) => `Wines similar to "${name}"`,
    similarNotFound:    "Wine not found in our selection.",
    similarNotFoundSub: "Try a different name, or use the name search above.",
    shareBtn:           "Share search",
    shareCopied:        "Link copied!",
    favTitle:           "My favourites",
    favEmpty:           "You haven't saved any wines yet. Click ❤️ on a wine to save it.",
    newBadge:           "New",
  },
} as const;

type QuickPreset = {
  emoji: string;
  da: string;
  en: string;
  occasionIdx: number;
  wineType: string | null;
  flavorIdx: number;
};

const QUICK_PRESETS: QuickPreset[] = [
  { emoji: "🔥", da: "Til grillen",    en: "BBQ night",        occasionIdx: 4,  wineType: "Rødvin",      flavorIdx: 1 },
  { emoji: "🫧", da: "Velkomstdrink",  en: "Welcome drink",    occasionIdx: 5,  wineType: "Mousserende", flavorIdx: 6 },
  { emoji: "💝", da: "Romantisk aften",en: "Romantic evening", occasionIdx: 3,  wineType: null,          flavorIdx: 3 },
  { emoji: "🍣", da: "Til sushi",      en: "For sushi",        occasionIdx: 13, wineType: "Hvidvin",     flavorIdx: 6 },
  { emoji: "🥩", da: "Til kødet",      en: "For meat",         occasionIdx: 14, wineType: "Rødvin",      flavorIdx: 3 },
  { emoji: "🌸", da: "Sommervin",      en: "Summer wine",      occasionIdx: 0,  wineType: "Hvidvin",     flavorIdx: 6 },
  { emoji: "🎁", da: "Gaveidé",        en: "Gift idea",        occasionIdx: 2,  wineType: null,          flavorIdx: 0 },
];

const OCCASION_ICONS = [
  UtensilsCrossed, PartyPopper, Gift, Heart, Flame,
  Coffee, Briefcase, Users, Cake, Snowflake, Star, Tv2, TreePine,
  Fish, Beef, Leaf, Shell, Wheat,
  Milk, Rabbit, Soup,
];

const TYPE_ICONS = [
  Wine, Wine, GlassWater, Flower2, Sparkles,
  Droplets, Grape, Coffee, Grape, GlassWater, Coffee, Droplets, Droplets, GlassWater,
];

type WineItem = {
  id: number;
  title: string;
  producer: string;
  country: string;
  wine_type: string;
  price_dkk: number;
  image_url: string;
  product_url: string;
  description: string;
  reason: string | null;
  sektion: string | null;
  is_new?: boolean;
  fruitiness: number | null;
  body: number | null;
  sweetness: number | null;
  acidity: number | null;
  tannin: number | null;
};

function chipStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "8px 16px", borderRadius: 100,
    border: `1.5px solid ${active ? "var(--primary-bg)" : "var(--border)"}`,
    backgroundColor: active ? "var(--primary-bg)" : "var(--chip-bg)",
    color: active ? "var(--primary-text)" : "var(--chip-text)",
    fontSize: 14, fontWeight: 500, cursor: "pointer",
  };
}

export default function VineFinderPage() {
  const [lang,        setLang]        = useState<Lang>("da");
  const [theme,       setTheme]       = useState<Theme>("light");
  const [wineType,    setWineType]    = useState<string | null>(null);
  const [country,     setCountry]     = useState<string | null>(null);
  const [countries,   setCountries]   = useState<string[]>([]);
  const [occasionIdx, setOccasionIdx] = useState(0);
  const [flavorIdx,   setFlavorIdx]   = useState(0);
  const [maxPrice,    setMaxPrice]    = useState<string>("");
  const [nameSearch,  setNameSearch]  = useState<string>("");
  const [loading,     setLoading]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [picks,       setPicks]       = useState<WineItem[]>([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [searched,    setSearched]    = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const resultsRef      = useRef<HTMLDivElement>(null);
  const [formOpen,         setFormOpen]         = useState(true);
  const [similarName,     setSimilarName]     = useState("");
  const [similarLoading,  setSimilarLoading]  = useState(false);
  const [similarPicks,    setSimilarPicks]    = useState<WineItem[]>([]);
  const [similarSearched, setSimilarSearched] = useState(false);
  const [similarRefTitle, setSimilarRefTitle] = useState("");
  const [similarNotFound, setSimilarNotFound] = useState(false);
  const [similarError,    setSimilarError]    = useState<string | null>(null);
  const similarResultsRef = useRef<HTMLDivElement>(null);
  const [favorites,  setFavorites]  = useState<WineItem[]>([]);
  const [copied,     setCopied]     = useState(false);
  const [autoSearch, setAutoSearch] = useState(false);

  useEffect(() => {
    if (searchCount > 0) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [searchCount]);

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vf_favs");
      if (saved) setFavorites(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Persist favorites
  useEffect(() => {
    try { localStorage.setItem("vf_favs", JSON.stringify(favorites)); } catch { /* ignore */ }
  }, [favorites]);

  // Read share-link URL params on load and auto-search
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const occ   = params.get("occasion");
    const type  = params.get("type");
    const flav  = params.get("flavor");
    const ctry  = params.get("country");
    const price = params.get("price");
    if (!occ && !type && !flav && !ctry && !price) return;
    if (occ) { const i = T.da.occasions.findIndex(o => o.toLowerCase() === occ); if (i >= 0) setOccasionIdx(i); }
    if (type)  setWineType(type);
    if (flav)  { const i = T.da.flavors.findIndex(f => f.key === flav); if (i >= 0) setFlavorIdx(i); }
    if (ctry)  setCountry(ctry);
    if (price) setMaxPrice(price);
    setAutoSearch(true);
  }, []);

  // Trigger search after URL params have been applied
  useEffect(() => {
    if (autoSearch) { setAutoSearch(false); fetchWines(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearch]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/countries`)
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch((e) => console.error("Failed to fetch countries:", e));
  }, []);

  const t = T[lang];

  function applyPreset(preset: QuickPreset) {
    setOccasionIdx(preset.occasionIdx);
    setWineType(preset.wineType);
    setFlavorIdx(preset.flavorIdx);
    setCountry(null);
    setMaxPrice("");
    setNameSearch("");
    fetchWines([], false, preset);
  }

  async function fetchWines(excludeIds: number[] = [], append = false, preset?: QuickPreset) {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
      setSearched(true);
      setPicks([]);
      setFormOpen(false);
      setSearchCount((c) => c + 1);
    }

    try {
      let newPicks: WineItem[];

      if (nameSearch.trim()) {
        const params = new URLSearchParams({ q: nameSearch.trim() });
        if (wineType) params.set("wine_type", wineType);
        if (maxPrice) params.set("max_price", maxPrice);
        if (country)  params.set("country", country);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/search?${params}`);
        const data = await res.json();
        newPicks = (data.picks || []) as WineItem[];
        setHasMore(false);
      } else {
        const effOccasionIdx = preset?.occasionIdx ?? occasionIdx;
        const effFlavorIdx   = preset?.flavorIdx   ?? flavorIdx;
        const effWineType    = preset ? preset.wineType : wineType;
        const occasionKey = T.da.occasions[effOccasionIdx].toLowerCase();
        const flavorKey   = t.flavors[effFlavorIdx].key;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            occasion:    occasionKey,
            flavor:      flavorKey,
            wine_type:   effWineType ?? undefined,
            country:     country ?? undefined,
            max_price:   maxPrice ? Number(maxPrice) : undefined,
            exclude_ids: excludeIds,
            language:    lang,
          }),
        });
        const data = await res.json();
        newPicks = (data.picks || []).slice(0, 3);
        setHasMore(newPicks.length === 3);
      }

      if (append) setPicks((p) => [...p, ...newPicks]);
      else setPicks(newPicks);
    } catch {
      setError(t.errorMsg);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleSearch   = () => fetchWines([], false);
  const handleLoadMore = () => fetchWines(picks.map((w) => w.id), true);

  function toggleFavorite(wine: WineItem) {
    setFavorites(prev =>
      prev.some(f => f.id === wine.id) ? prev.filter(f => f.id !== wine.id) : [...prev, wine]
    );
  }

  function copyShareLink() {
    const params = new URLSearchParams();
    params.set("occasion", T.da.occasions[occasionIdx].toLowerCase());
    if (wineType) params.set("type", wineType);
    params.set("flavor", T.da.flavors[flavorIdx].key);
    if (country)  params.set("country", country);
    if (maxPrice) params.set("price", maxPrice);
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?${params}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleSimilarSearch() {
    if (!similarName.trim()) return;
    setSimilarLoading(true);
    setSimilarSearched(true);
    setSimilarPicks([]);
    setSimilarNotFound(false);
    setSimilarError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/similar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wine_name: similarName.trim(), language: lang }),
      });
      const data = await res.json();
      if (data.not_found) {
        setSimilarNotFound(true);
      } else {
        setSimilarPicks(data.picks || []);
        setSimilarRefTitle(data.reference?.title || similarName);
      }
    } catch {
      setSimilarError(t.errorMsg);
    } finally {
      setSimilarLoading(false);
      setTimeout(() => similarResultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  function handleReset() {
    setWineType(null);
    setCountry(null);
    setOccasionIdx(0);
    setFlavorIdx(0);
    setMaxPrice("");
    setNameSearch("");
    setSearched(false);
    setPicks([]);
    setError(null);
    setFormOpen(true);
  }

  return (
    <div data-theme={theme} style={{ minHeight: "100vh", backgroundColor: "var(--page-bg)" }}>

      {/* Header */}
      <header style={{
        backgroundColor: "var(--nav-bg)", padding: "0 24px",
        position: "sticky", top: 0, zIndex: 50,
        borderBottom: "1px solid rgba(232,213,183,0.08)",
      }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wine size={20} color="var(--nav-text)" />
            <span style={{ color: "var(--nav-text)", fontSize: 13, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>VinFinder</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/lande" className="nav-label" style={{ color: "var(--nav-mid)", fontSize: 12, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", textDecoration: "none" }}>
              Vine efter land
            </a>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="nav-icon-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "rgba(245,239,230,0.1)",
                border: "1px solid rgba(245,239,230,0.2)",
                borderRadius: 6, padding: "5px 8px",
                color: "var(--nav-text)", cursor: "pointer",
              }}
            >
              {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button
              onClick={() => { setLang(lang === "da" ? "en" : "da"); setSearched(false); setPicks([]); }}
              className="nav-icon-btn"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                backgroundColor: "rgba(245,239,230,0.1)",
                border: "1px solid rgba(245,239,230,0.2)",
                borderRadius: 6, padding: "5px 10px",
                color: "var(--nav-text)", fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.5,
              }}
            >
              <Globe size={13} />
              {lang === "da" ? "EN" : "DA"}
            </button>
          </div>
        </div>
      </header>

      {/* Hero — dramatic image banner */}
      <div style={{
        position: "relative", overflow: "hidden",
        backgroundImage: "url(/shelf-images/Refernce1.jpg)",
        backgroundSize: "cover", backgroundPosition: "center 35%",
        minHeight: 560, display: "flex", alignItems: "center",
      }}>
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(40,5,14,0.60) 0%, rgba(40,5,14,0.82) 60%, rgba(25,3,9,0.97) 100%)" }} />
        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 860, margin: "0 auto", width: "100%", padding: "88px 24px 104px", textAlign: "center" }}>
          <p style={{ color: "rgba(245,239,230,0.45)", fontSize: 11, fontWeight: 600, letterSpacing: 4, textTransform: "uppercase", marginBottom: 24, marginTop: 0 }}>
            Vinifera · Birkerød
          </p>
          <h1 className="hero-title" style={{ color: "#F5EFE6", fontSize: "clamp(44px, 6.5vw, 72px)", fontWeight: 500, marginBottom: 20, lineHeight: 1.08, letterSpacing: 0.5, fontFamily: "var(--font-heading)" }}>
            {t.heroTitle}
          </h1>
          <p className="hero-sub" style={{ color: "rgba(245,239,230,0.65)", fontSize: 16, lineHeight: 1.85, maxWidth: 460, margin: "0 auto 40px", fontWeight: 400 }}>
            {t.heroSub}
          </p>
          {/* Quick presets */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {QUICK_PRESETS.map((p) => (
              <button
                key={p.da}
                onClick={() => applyPreset(p)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "9px 18px", borderRadius: 100,
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(245,239,230,0.25)",
                  color: "rgba(245,239,230,0.90)", fontSize: 14, fontWeight: 500,
                  cursor: "pointer", whiteSpace: "nowrap",
                  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                }}
              >
                <span style={{ fontSize: 16 }}>{p.emoji}</span>
                {lang === "da" ? p.da : p.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form card */}
      <div style={{ maxWidth: 860, margin: "-44px auto 0", padding: "0 20px 60px" }}>
        <div className="form-card" style={{ backgroundColor: "var(--card-bg)", borderRadius: 28, boxShadow: "0 -2px 16px rgba(0,0,0,0.18), 0 8px 40px var(--card-shadow)", padding: "60px 32px 36px", marginBottom: 32 }}>

          {searched && !formOpen ? (
            /* Collapsed state */
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {([
                  wineType ? t.wineTypes.find((w) => w.value === wineType)?.label : null,
                  country,
                  t.occasions[occasionIdx],
                  t.flavors[flavorIdx].label,
                  maxPrice ? `max ${maxPrice} kr` : null,
                ] as (string | null)[]).filter(Boolean).map((lbl) => (
                  <span key={lbl!} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-mid)", backgroundColor: "var(--chip-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>
                    {lbl}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setFormOpen(true)} className="buy-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text)", backgroundColor: "var(--buy-btn-bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 14px", cursor: "pointer" }}>
                  <SlidersHorizontal size={13} />{t.refineSearch}
                </button>
                <button onClick={handleReset} className="reset-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: "var(--text-mid)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                  <X size={13} />{t.resetFilters}
                </button>
              </div>
            </div>
          ) : (
            /* Full form */
            <>
              {/* Occasion */}
              <Section label={t.sectionOccasion}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {t.occasions.map((label, i) => {
                    const active = occasionIdx === i;
                    const Icon = OCCASION_ICONS[i];
                    return (
                      <button key={label} onClick={() => setOccasionIdx(i)} className={`chip${active ? " active" : ""}`} style={chipStyle(active)}>
                        <Icon size={14} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Divider />

              {/* Type */}
              <Section label={t.sectionType}>
                <div className="type-chips-row">
                  {t.wineTypes.map(({ label, value }, i) => {
                    const active = wineType === value;
                    const Icon = TYPE_ICONS[i];
                    return (
                      <button key={label} onClick={() => setWineType(value)} className={`chip${active ? " active" : ""}`} style={chipStyle(active)}>
                        <Icon size={14} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Divider />

              {/* Country */}
              <Section label={t.sectionCountry}>
                <div className="type-chips-row">
                  <button
                    onClick={() => setCountry(null)}
                    className={`chip${country === null ? " active" : ""}`}
                    style={chipStyle(country === null)}
                  >
                    {t.countryAll}
                  </button>
                  {countries.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCountry(country === c ? null : c)}
                      className={`chip${country === c ? " active" : ""}`}
                      style={chipStyle(country === c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </Section>

              <Divider />

              {/* Flavor */}
              <Section label={t.sectionFlavor}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {t.flavors.map(({ label, desc }, i) => {
                    const active = flavorIdx === i;
                    return (
                      <button key={label} onClick={() => setFlavorIdx(i)} className={`chip${active ? " active" : ""}`} style={{ ...chipStyle(active), flexDirection: "column", alignItems: "flex-start", gap: 1, padding: "10px 16px" }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{label}</span>
                        <span style={{ fontSize: 11, opacity: 0.65, fontWeight: 400 }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Divider />

              {/* Price presets */}
              <Section label={t.sectionPrice}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {t.pricePresets.map(({ label, value }) => {
                    const active = maxPrice === value;
                    return (
                      <button key={label} onClick={() => setMaxPrice(value)} className={`chip${active ? " active" : ""}`} style={chipStyle(active)}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              <Divider />

              {/* CTA */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button onClick={handleSearch} disabled={loading} className="find-btn" style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: "var(--primary-bg)", color: "var(--primary-text)", border: "none", borderRadius: 8, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, whiteSpace: "nowrap" }}>
                  {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={16} />}
                  {loading ? t.searching : t.findBtn}
                </button>
                {(wineType !== null || country !== null || occasionIdx !== 0 || flavorIdx !== 0 || maxPrice !== "" || nameSearch !== "") && (
                  <button onClick={handleReset} className="reset-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: "var(--text-mid)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                    <X size={13} />{t.resetFilters}
                  </button>
                )}
                <div style={{ flex: "1 1 100%", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
                  {([
                    wineType ? t.wineTypes.find((w) => w.value === wineType)?.label : null,
                    country,
                    t.occasions[occasionIdx],
                    t.flavors[flavorIdx].label,
                    maxPrice ? `max ${maxPrice} kr` : null,
                  ] as (string | null)[]).filter(Boolean).map((lbl) => (
                    <span key={lbl!} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-mid)", backgroundColor: "var(--chip-bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "3px 8px" }}>
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>

              <Divider />

              {/* Name search — optional shortcut */}
              <Section label={t.sectionSearch}>
                <input
                  type="text"
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={t.searchPlaceholder}
                  style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 15, width: "100%", maxWidth: 340, backgroundColor: "var(--input-bg)", color: "var(--text)", outline: "none", boxSizing: "border-box" }}
                />
              </Section>

              {error && <p style={{ color: "#C0392B", fontSize: 14, marginTop: 16, fontWeight: 500 }}>{error}</p>}
            </>
          )}
        </div>

        {/* Results */}
        {searched && (
          <div ref={resultsRef} style={{ scrollMarginTop: 80 }}>
            {loading && !loadingMore && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            )}
            {!loading && picks.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", margin: 0 }}>{t.resultsCount(picks.length)}</h2>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={copyShareLink} className="reset-btn" style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: copied ? "#2d6a4f" : "var(--text-mid)", fontSize: 13, fontWeight: copied ? 700 : 500, cursor: "pointer" }}>
                    <Share2 size={13} />{copied ? t.shareCopied : t.shareBtn}
                  </button>
                  <button onClick={handleSearch} className="reset-btn" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-mid)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    <RefreshCw size={13} />{t.searchAgain}
                  </button>
                </div>
              </div>
            )}

            {!loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {picks.map((wine, i) => (
                  <WineCard key={wine.id} wine={wine} rank={i + 1} t={t} isFav={favorites.some(f => f.id === wine.id)} onToggleFav={toggleFavorite} />
                ))}
              </div>
            )}

            {!loading && picks.length > 0 && hasMore && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button onClick={handleLoadMore} disabled={loadingMore} className="more-btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "var(--card-bg)", color: "var(--text)", border: "1.5px solid var(--border)", borderRadius: 8, padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.6 : 1, boxShadow: "0 1px 4px var(--card-shadow)" }}>
                  {loadingMore
                    ? <><Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />{t.loadingMore}</>
                    : <><ChevronRight size={15} />{t.loadMore}</>}
                </button>
              </div>
            )}

            {!loading && picks.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: "48px 0" }}>
                <Wine size={36} color="var(--border)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{t.emptyTitle}</p>
                <p style={{ fontSize: 14, color: "var(--text-mid)" }}>{t.emptySub}</p>
              </div>
            )}
          </div>
        )}

        {/* Similar wines card */}
        <div className="form-card" style={{ backgroundColor: "var(--card-bg)", borderRadius: 16, boxShadow: "0 4px 24px var(--card-shadow)", padding: "28px 28px", marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>{t.sectionSimilar}</h2>
            <p style={{ fontSize: 13, color: "var(--text-mid)", margin: 0, lineHeight: 1.55 }}>{t.similarSub}</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              value={similarName}
              onChange={(e) => setSimilarName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSimilarSearch()}
              placeholder={t.similarPlaceholder}
              style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 15, flex: "1 1 200px", minWidth: 0, backgroundColor: "var(--input-bg)", color: "var(--text)", outline: "none" }}
            />
            <button
              onClick={handleSimilarSearch}
              disabled={similarLoading || !similarName.trim()}
              className="find-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: "var(--primary-bg)", color: "var(--primary-text)", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 14, fontWeight: 600, cursor: (similarLoading || !similarName.trim()) ? "not-allowed" : "pointer", opacity: (similarLoading || !similarName.trim()) ? 0.6 : 1, whiteSpace: "nowrap" }}
            >
              {similarLoading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={15} />}
              {similarLoading ? t.similarSearching : t.similarBtn}
            </button>
          </div>
        </div>

        {/* Similar results */}
        {similarSearched && (
          <div ref={similarResultsRef} style={{ marginBottom: 48, scrollMarginTop: 80 }}>
            {similarLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            )}
            {!similarLoading && similarNotFound && (
              <div style={{ textAlign: "center", padding: "36px 0" }}>
                <Wine size={36} color="var(--border)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>{t.similarNotFound}</p>
                <p style={{ fontSize: 14, color: "var(--text-mid)" }}>{t.similarNotFoundSub}</p>
              </div>
            )}
            {!similarLoading && !similarNotFound && similarPicks.length > 0 && (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{t.similarRef(similarRefTitle)}</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {similarPicks.map((wine, i) => (
                    <WineCard key={wine.id} wine={wine} rank={i + 1} t={t} isFav={favorites.some(f => f.id === wine.id)} onToggleFav={toggleFavorite} />
                  ))}
                </div>
              </>
            )}
            {!similarLoading && similarError && (
              <p style={{ color: "#C0392B", fontSize: 14, fontWeight: 500 }}>{similarError}</p>
            )}
          </div>
        )}

        {/* Favourites section */}
        {favorites.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Heart size={17} fill="#e63946" color="#e63946" />{t.favTitle} ({favorites.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {favorites.map((wine) => (
                <WineCard key={wine.id} wine={wine} t={t} isFav={true} onToggleFav={toggleFavorite} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: "var(--nav-bg)", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--nav-mid)", fontSize: 12, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
          VinFinder · {t.footerSub}
        </p>
        <a href="https://viniferavin.dk" target="_blank" rel="noreferrer" style={{ color: "var(--nav-text)", fontSize: 12, textDecoration: "none", opacity: 0.5 }}>
          vinfinder
        </a>
      </footer>

      <style>{`
        [data-theme="light"] {
          --page-bg:           #EAE5DC;
          --nav-bg:            #6B1428;
          --nav-text:          #F5EFE6;
          --nav-mid:           rgba(245,239,230,0.55);
          --hero-sub:          #A8885F;
          --card-bg:           #FDFAF6;
          --card-shadow:       rgba(107,20,40,0.07);
          --sidebar-bg:        #F0EBE2;
          --input-bg:          #EAE5DC;
          --primary-bg:        #6B1428;
          --primary-text:      #F5EFE6;
          --primary-hover-bg:  #85192F;
          --text:              #1A1A1A;
          --text-mid:          #6B5B4E;
          --text-sub:          #3D3028;
          --border:            #DDD8CE;
          --chip-bg:           #EAE5DC;
          --chip-text:         #2A2015;
          --chip-hover-bg:     #E0DBD1;
          --chip-hover-border: #6B1428;
          --buy-btn-bg:        #F0EBE2;
          --buy-hover-bg:      #E5DFD5;
          --buy-hover-border:  #6B1428;
          --more-hover-bg:     #E0DBD1;
          --reset-hover-text:  #6B1428;
          --reset-hover-bg:    #F0EBE2;
        }
        [data-theme="dark"] {
          --page-bg:           #110905;
          --nav-bg:            #0C0503;
          --nav-text:          #EAD9BC;
          --nav-mid:           #7A5A3A;
          --hero-sub:          #7A5A3A;
          --card-bg:           #291408;
          --card-shadow:       rgba(0,0,0,0.40);
          --sidebar-bg:        #1C0C07;
          --input-bg:          #180B06;
          --primary-bg:        #EAD9BC;
          --primary-text:      #241510;
          --primary-hover-bg:  #D4C3A3;
          --text:              #EAD9BC;
          --text-mid:          #A08060;
          --text-sub:          #C4A882;
          --border:            #3A2318;
          --chip-bg:           #180B06;
          --chip-text:         #C4A882;
          --chip-hover-bg:     #221108;
          --chip-hover-border: #C4A882;
          --buy-btn-bg:        #180B06;
          --buy-hover-bg:      #3A2318;
          --buy-hover-border:  #C4A882;
          --more-hover-bg:     #221108;
          --reset-hover-text:  #EAD9BC;
          --reset-hover-bg:    #221108;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .skeleton { background: linear-gradient(90deg, var(--border) 25%, var(--chip-hover-bg) 50%, var(--border) 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        .chip { transition: all 0.2s ease; }
        .chip:not(.active):hover { border-color: var(--chip-hover-border)!important; background-color: var(--chip-hover-bg)!important; transform: translateY(-1px); box-shadow: 0 3px 12px rgba(0,0,0,0.10); }
        .chip:not(.active):active { transform: translateY(0); }
        .wine-card { transition: box-shadow 0.25s ease, transform 0.25s ease; }
        .wine-card:hover { box-shadow: 0 8px 32px var(--card-shadow)!important; transform: translateY(-3px); }
        .find-btn { transition: opacity 0.2s, transform 0.2s, background-color 0.2s, box-shadow 0.2s; }
        .find-btn:hover:not(:disabled) { background-color: var(--primary-hover-bg)!important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
        .find-btn:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
        .buy-btn { transition: background-color 0.2s, border-color 0.2s, transform 0.2s; }
        .buy-btn:hover { background-color: var(--buy-hover-bg)!important; border-color: var(--buy-hover-border)!important; transform: translateY(-1px); }
        .buy-btn:active { transform: translateY(0); }
        .more-btn { transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s; }
        .more-btn:hover:not(:disabled) { background-color: var(--more-hover-bg)!important; transform: translateY(-1px); }
        .more-btn:active:not(:disabled) { transform: translateY(0); }
        .reset-btn { transition: color 0.2s, background-color 0.2s; border-radius: 100px; padding: 5px 10px; }
        .reset-btn:hover { color: var(--reset-hover-text)!important; background-color: var(--reset-hover-bg); }
        .nav-icon-btn { transition: background-color 0.2s, border-color 0.2s; }
        .nav-icon-btn:hover { background-color: rgba(245,239,230,0.15)!important; border-color: rgba(245,239,230,0.35)!important; }

        .type-chips-row { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (max-width: 480px) {
          .type-chips-row { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; scrollbar-width: none; }
          .type-chips-row::-webkit-scrollbar { display: none; }
          .type-chips-row .chip { flex-shrink: 0; }
        }
        @media (max-width: 480px) {
          .nav-label { display: none !important; }
          .hero-title { font-size: 30px !important; letter-spacing: 0px !important; }
          .hero-sub { font-size: 14px !important; }
          .form-card { padding: 48px 16px 20px !important; }
          .find-btn { width: 100% !important; justify-content: center !important; }
          .wine-card-sidebar { width: 90px !important; }
          .wine-card-img { width: 55px !important; height: 95px !important; }
        }
      `}</style>
    </div>
  );
}

async function resizeImage(file: File): Promise<{ data: string; type: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ data: dataUrl.split(",")[1], type: "image/jpeg" });
    };
    img.src = url;
  });
}

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
      <div style={{ display: "flex" }}>
        <div className="skeleton" style={{ width: 140, flexShrink: 0, height: 160 }} />
        <div style={{ flex: 1, padding: "18px 18px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ height: 16, borderRadius: 4, width: "65%" }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: "40%" }} />
          <div className="skeleton" style={{ height: 12, borderRadius: 4, width: "80%", marginTop: 8 }} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <div className="skeleton" style={{ height: 30, borderRadius: 6, width: 120 }} />
            <div className="skeleton" style={{ height: 30, borderRadius: 6, width: 110 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: "var(--text-mid)", marginBottom: 14, opacity: 0.8 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: "var(--border)", margin: "26px 0", opacity: 0.7 }} />;
}

type Translations = typeof T[Lang];

function StoreMap({ sektion }: { sektion: string }) {
  const ACTIVE = "#2d6a4f";
  const INACTIVE = "var(--chip-bg, #f0ede7)";
  const BORDER = "#c8bfae";
  const LBL = "#999";

  const fill   = (id: string) => sektion === id ? ACTIVE : INACTIVE;
  const txtFill = (id: string) => sektion === id ? "#fff" : LBL;

  return (
    <svg viewBox="0 0 295 185" style={{ width: "100%", maxWidth: 295, display: "block" }}>
      {/* Reol 1 — right wall, 6 hylder */}
      <text x="268" y="9" textAnchor="middle" fontSize="8" fill={LBL} fontWeight="700">Reol 1</text>
      {[1,2,3,4,5,6].map(h => {
        const id = `Reol 1 - Hylde ${h}`;
        const y = 12 + (h-1)*27;
        return (
          <g key={id}>
            <rect x={248} y={y} width={40} height={26} rx={3} fill={fill(id)} stroke={BORDER} strokeWidth={0.8} />
            <text x={268} y={y+15} textAnchor="middle" fontSize="8" fill={txtFill(id)} fontWeight={sektion===id?"700":"400"}>H{h}</text>
          </g>
        );
      })}

      {/* Reol 2 — 5 hylder */}
      <text x="215" y="9" textAnchor="middle" fontSize="8" fill={LBL} fontWeight="700">Reol 2</text>
      {[1,2,3,4,5].map(h => {
        const id = `Reol 2 - Hylde ${h}`;
        const y = 12 + (h-1)*27;
        return (
          <g key={id}>
            <rect x={188} y={y} width={54} height={26} rx={3} fill={fill(id)} stroke={BORDER} strokeWidth={0.8} />
            <text x={215} y={y+15} textAnchor="middle" fontSize="8" fill={txtFill(id)} fontWeight={sektion===id?"700":"400"}>H{h}</text>
          </g>
        );
      })}

      {/* Reol 3 */}
      <text x="71" y="9" textAnchor="middle" fontSize="8" fill={LBL} fontWeight="700">Reol 3</text>

      {/* Reol 3 Venstre — spiritus/port */}
      <rect x={14} y={12} width={52} height={81} rx={3} fill={fill("Reol 3 - Venstre")} stroke={BORDER} strokeWidth={0.8} />
      <text x={40} y={47} textAnchor="middle" fontSize="8" fill={txtFill("Reol 3 - Venstre")} fontWeight="600">Venstre</text>
      <text x={40} y={59} textAnchor="middle" fontSize="7" fill={txtFill("Reol 3 - Venstre")} opacity={0.75}>Spiritus</text>
      <text x={40} y={69} textAnchor="middle" fontSize="7" fill={txtFill("Reol 3 - Venstre")} opacity={0.75}>& Port</text>

      {/* Reol 3 Højre — hylde 2, 3, 4 */}
      {([2,3,4] as const).map((h, i) => {
        const id = `Reol 3 - Hojre - Hylde ${h}`;
        const y = 12 + i*27;
        return (
          <g key={id}>
            <rect x={70} y={y} width={58} height={26} rx={3} fill={fill(id)} stroke={BORDER} strokeWidth={0.8} />
            <text x={99} y={y+15} textAnchor="middle" fontSize="8" fill={txtFill(id)} fontWeight={sektion===id?"700":"400"}>Højre H{h}</text>
          </g>
        );
      })}

      {/* Hvid Reol — freestanding */}
      <rect x={14} y={110} width={148} height={36} rx={3} fill={fill("Hvid Reol")} stroke={BORDER} strokeWidth={0.8} />
      <text x={88} y={130} textAnchor="middle" fontSize="9" fill={txtFill("Hvid Reol")} fontWeight="600">Hvid Reol</text>
      <text x={88} y={141} textAnchor="middle" fontSize="7" fill={txtFill("Hvid Reol")} opacity={0.75}>Rosé & Cider</text>

      {/* Entry */}
      <text x="215" y="178" textAnchor="middle" fontSize="7.5" fill="#bbb">↓ Indgang</text>
    </svg>
  );
}

function WineCard({ wine, rank, t, isFav, onToggleFav }: { wine: WineItem; rank?: number; t: Translations; isFav?: boolean; onToggleFav?: (w: WineItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showMap,  setShowMap]  = useState(false);
  const CUTOFF = 240;
  return (
    <div className="wine-card" style={{ backgroundColor: "var(--card-bg)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "0 2px 12px var(--card-shadow)" }}>
      <div style={{ display: "flex" }}>
        <div className="wine-card-sidebar" style={{ width: 140, flexShrink: 0, backgroundColor: "var(--sidebar-bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px 10px", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", backgroundColor: "var(--primary-bg)", color: "var(--primary-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
            {rank}
          </div>
          {wine.image_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="wine-card-img" src={wine.image_url} alt={wine.title} style={{ width: 80, height: 140, objectFit: "contain" }} />
            : <Wine size={48} color="var(--text-mid)" />}
        </div>

        <div style={{ flex: 1, padding: "18px 18px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 8 }}>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--text)", margin: 0, lineHeight: 1.3, fontFamily: "var(--font-heading)", letterSpacing: 0.1 }}>{wine.title}</h3>
                {wine.is_new && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: "#fff", backgroundColor: "#d97706", borderRadius: 4, padding: "3px 6px", letterSpacing: 0.5, marginTop: 3 }}>{t.newBadge}</span>}
              </div>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{wine.price_dkk} kr</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-mid)", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.4 }}>
              {[wine.producer, wine.country, wine.wine_type].filter(Boolean).join(" · ")}
            </p>
            {wine.sektion && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={() => setShowMap(m => !m)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#fff", backgroundColor: "#2d6a4f", borderRadius: 20, padding: "4px 12px", border: "none", cursor: "pointer" }}
                >
                  📍 {wine.sektion}
                  <span style={{ fontSize: 10, opacity: 0.75 }}>{showMap ? "▲" : "▼"}</span>
                </button>
                {showMap && (
                  <div style={{ marginTop: 8, padding: 12, borderRadius: 12, border: "1px solid #c8e6d4", backgroundColor: "#f2f8f5" }}>
                    <StoreMap sektion={wine.sektion} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <a href={wine.product_url} target="_blank" rel="noreferrer" className="buy-btn" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: "var(--text)", textDecoration: "none", backgroundColor: "var(--buy-btn-bg)", border: "1px solid var(--border)", borderRadius: 100, padding: "6px 14px" }}>
              <ExternalLink size={12} />{t.buyBtn}
            </a>
            {onToggleFav && (
              <button onClick={() => onToggleFav(wine)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", color: isFav ? "#e63946" : "var(--text-mid)" }}>
                <Heart size={18} fill={isFav ? "#e63946" : "none"} />
              </button>
            )}
          </div>
        </div>
      </div>

      {(wine.reason || wine.description) && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {wine.reason && (
            <div style={{ display: "flex", gap: 10 }}>
              <Sparkles size={14} color="var(--text-mid)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text-mid)", display: "block", marginBottom: 3 }}>{t.recLabel}</span>
                <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>&ldquo;{wine.reason}&rdquo;</p>
              </div>
            </div>
          )}
          {[wine.fruitiness, wine.body, wine.sweetness, wine.acidity, wine.tannin].some((v) => v != null && v > 0) && (
            <div style={{ display: "flex", gap: 10 }}>
              <Droplets size={14} color="var(--text-mid)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text-mid)", display: "block", marginBottom: 6 }}>{t.tasteLabel}</span>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px", alignItems: "center" }}>
                  {([wine.fruitiness, wine.body, wine.sweetness, wine.acidity, wine.tannin] as (number | null)[]).map((score, i) => (
                    score != null ? (
                      <>
                        <span key={`label-${i}`} style={{ fontSize: 11, color: "var(--text-mid)", fontWeight: 500, whiteSpace: "nowrap" }}>{t.tasteKeys[i]}</span>
                        <div key={`bar-${i}`} style={{ display: "flex", gap: 3 }}>
                          {[1,2,3,4,5].map((dot) => (
                            <div key={dot} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: dot <= score ? "var(--primary-bg)" : "var(--border)" }} />
                          ))}
                        </div>
                      </>
                    ) : null
                  ))}
                </div>
              </div>
            </div>
          )}
          {wine.description && (
            <div style={{ display: "flex", gap: 10 }}>
              <Grape size={14} color="var(--text-mid)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--text-mid)", display: "block", marginBottom: 3 }}>{t.noteLabel}</span>
                <p style={{ fontSize: 13, color: "var(--text-sub)", lineHeight: 1.7, margin: 0 }}>
                  {!expanded && wine.description.length > CUTOFF
                    ? wine.description.slice(0, CUTOFF).trimEnd() + "…"
                    : wine.description}
                </p>
                {wine.description.length > CUTOFF && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    style={{ background: "none", border: "none", padding: "4px 0 0", fontSize: 12, fontWeight: 600, color: "var(--text-mid)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 2 }}
                  >
                    {expanded ? t.readLess : t.readMore}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
