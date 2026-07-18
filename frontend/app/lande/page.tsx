"use client";

import { useState, useEffect } from "react";
import { Wine, ArrowLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type WineItem = {
  id: number;
  title: string;
  producer: string | null;
  country: string | null;
  wine_type: string | null;
  price_dkk: number | null;
  image_url: string | null;
  product_url: string | null;
  sektion: string | null;
  is_new: boolean;
};

const COUNTRY_FLAGS: Record<string, string> = {
  "Frankrig":                  "🇫🇷",
  "Italien":                   "🇮🇹",
  "Spanien":                   "🇪🇸",
  "Portugal":                  "🇵🇹",
  "Tyskland":                  "🇩🇪",
  "Østrig":                    "🇦🇹",
  "USA":                       "🇺🇸",
  "Australien":                "🇦🇺",
  "New Zealand":               "🇳🇿",
  "Sydafrika":                 "🇿🇦",
  "Argentina":                 "🇦🇷",
  "Chile":                     "🇨🇱",
  "Ungarn":                    "🇭🇺",
  "Grækenland":                "🇬🇷",
  "Danmark":                   "🇩🇰",
  "Canada":                    "🇨🇦",
  "Storbritannien":            "🇬🇧",
  "Norge":                     "🇳🇴",
  "Mexico":                    "🇲🇽",
  "Peru":                      "🇵🇪",
  "Den Dominikanske Republik": "🇩🇴",
  "Slovenien":                 "🇸🇮",
  "Kroatien":                  "🇭🇷",
  "Schweiz":                   "🇨🇭",
  "Israel":                    "🇮🇱",
  "Libanon":                   "🇱🇧",
  "Georgien":                  "🇬🇪",
};

const WINE_TYPES = [
  { label: "Alle typer", value: null },
  { label: "Rødvin",     value: "Rødvin" },
  { label: "Hvidvin",    value: "Hvidvin" },
  { label: "Rosévin",    value: "Rosévin" },
  { label: "Mousserende",value: "Mousserende" },
  { label: "Portvin",    value: "Portvin" },
  { label: "Dessertvin", value: "Dessertvin" },
  { label: "Spiritus",   value: "Spiritus" },
];

export default function LandePage() {
  const [countries,  setCountries]  = useState<string[]>([]);
  const [selected,   setSelected]   = useState<string | null>(null);
  const [wineType,   setWineType]   = useState<string | null>(null);
  const [wines,      setWines]      = useState<WineItem[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [loadingMore,setLoadingMore]= useState(false);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const PER_PAGE = 24;

  useEffect(() => {
    fetch(`${API}/api/countries`)
      .then(r => r.json())
      .then(d => setCountries(d.countries ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setWines([]);
    setPage(1);
    const params = new URLSearchParams({ country: selected, page: "1" });
    if (wineType) params.set("wine_type", wineType);
    fetch(`${API}/api/wines?${params}`)
      .then(r => r.json())
      .then(d => { setWines(d.wines ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [selected, wineType]);

  function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    const params = new URLSearchParams({ country: selected!, page: String(next) });
    if (wineType) params.set("wine_type", wineType);
    fetch(`${API}/api/wines?${params}`)
      .then(r => r.json())
      .then(d => { setWines(prev => [...prev, ...(d.wines ?? [])]); setPage(next); })
      .finally(() => setLoadingMore(false));
  }

  function selectCountry(c: string) {
    setSelected(c);
    setWineType(null);
    setWines([]);
    setPage(1);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#EAE5DC" }}>
      {/* Nav */}
      <header style={{ backgroundColor: "#6B1428", padding: "0 24px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16, height: 60 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "rgba(245,239,230,0.55)", fontSize: 13, fontWeight: 500 }}>
            <ArrowLeft size={14} />Vinfinder
          </a>
          <span style={{ color: "rgba(245,239,230,0.2)" }}>|</span>
          <span style={{ color: "#F5EFE6", fontSize: 13, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Vine efter land</span>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* Country chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {countries.map(c => (
            <button
              key={c}
              onClick={() => selectCountry(c)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 100,
                backgroundColor: selected === c ? "#6B1428" : "#FDFAF6",
                color: selected === c ? "#F5EFE6" : "#1A1A1A",
                border: `1.5px solid ${selected === c ? "#6B1428" : "#DDD8CE"}`,
                fontSize: 14, fontWeight: selected === c ? 700 : 500,
                cursor: "pointer", transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 20 }}>{COUNTRY_FLAGS[c] ?? "🍷"}</span>
              {c}
            </button>
          ))}
        </div>

        {/* Wine type filter */}
        {selected && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {WINE_TYPES.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setWineType(value)}
                style={{
                  padding: "6px 14px", borderRadius: 100,
                  backgroundColor: wineType === value ? "#6B1428" : "transparent",
                  color: wineType === value ? "#F5EFE6" : "#6B5B4E",
                  border: `1px solid ${wineType === value ? "#6B1428" : "#DDD8CE"}`,
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Count */}
        {selected && !loading && wines.length > 0 && (
          <p style={{ fontSize: 13, color: "#6B5B4E", marginBottom: 16 }}>
            {COUNTRY_FLAGS[selected] ?? "🍷"} <strong>{selected}</strong> · {total} vine{wineType ? ` (${wineType})` : ""}
          </p>
        )}

        {/* Skeleton loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 88, borderRadius: 14, background: "linear-gradient(90deg,#F0EBE2 25%,#E5DFD5 50%,#F0EBE2 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
            ))}
          </div>
        )}

        {/* Wine rows */}
        {!loading && wines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {wines.map(wine => (
              <div key={wine.id} style={{ backgroundColor: "#FDFAF6", borderRadius: 14, border: "1px solid #DDD8CE", display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", boxShadow: "0 1px 4px rgba(107,20,40,0.04)" }}>
                {wine.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={wine.image_url} alt={wine.title} style={{ width: 40, height: 66, objectFit: "contain", flexShrink: 0 }} />
                  : <div style={{ width: 40, height: 66, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Wine size={22} color="#DDD8CE" /></div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1A1A1A", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{wine.title}</span>
                    {wine.is_new && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: "#fff", backgroundColor: "#d97706", borderRadius: 4, padding: "2px 6px" }}>Ny</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B5B4E" }}>
                    {[wine.producer, wine.wine_type].filter(Boolean).join(" · ")}
                  </div>
                  {wine.sektion && (
                    <span style={{ marginTop: 4, fontSize: 11, color: "#fff", backgroundColor: "#2d6a4f", borderRadius: 10, padding: "2px 8px", display: "inline-block", fontWeight: 600 }}>
                      📍 {wine.sektion}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  {wine.price_dkk != null && <span style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A", whiteSpace: "nowrap" }}>{wine.price_dkk} kr</span>}
                  {wine.product_url && (
                    <a href={wine.product_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: "#6B1428", textDecoration: "none" }}>
                      <ExternalLink size={11} />Køb
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && wines.length > 0 && wines.length < total && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 8, backgroundColor: "#FDFAF6", border: "1.5px solid #DDD8CE", fontSize: 14, fontWeight: 600, color: "#1A1A1A", cursor: loadingMore ? "not-allowed" : "pointer", opacity: loadingMore ? 0.6 : 1 }}
            >
              {loadingMore ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ChevronRight size={15} />}
              {loadingMore ? "Henter..." : `Vis flere (${total - wines.length} tilbage)`}
            </button>
          </div>
        )}

        {/* Empty / prompt */}
        {!selected && !loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B5B4E" }}>
            <Wine size={44} color="#DDD8CE" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Vælg et land for at se vine</p>
          </div>
        )}

        {!loading && selected && wines.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#6B5B4E" }}>
            <p style={{ fontSize: 15 }}>Ingen vine fundet fra {selected}{wineType ? ` (${wineType})` : ""}.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
