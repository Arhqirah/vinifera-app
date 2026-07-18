"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const SEKTIONER = [
  "Reol 1 - Hylde 1", "Reol 1 - Hylde 2", "Reol 1 - Hylde 3",
  "Reol 1 - Hylde 4", "Reol 1 - Hylde 5", "Reol 1 - Hylde 6",
  "Reol 2 - Hylde 1", "Reol 2 - Hylde 2", "Reol 2 - Hylde 3",
  "Reol 2 - Hylde 4", "Reol 2 - Hylde 5",
  "Reol 3 - Hojre - Hylde 2", "Reol 3 - Hojre - Hylde 3", "Reol 3 - Hojre - Hylde 4",
  "Reol 3 - Venstre", "Hvid Reol",
];

type Wine = {
  id: number;
  title: string;
  producer: string | null;
  wine_type: string | null;
  country: string | null;
  price_dkk: number | null;
  sektion: string | null;
  is_new: boolean;
  sweetness: number | null;
  fruitiness: number | null;
  body: number | null;
  acidity: number | null;
  tannin: number | null;
};

type ScoreField = "sweetness" | "fruitiness" | "body" | "acidity" | "tannin";
const SCORE_FIELDS: { key: ScoreField; label: string }[] = [
  { key: "sweetness",  label: "Sødme" },
  { key: "fruitiness", label: "Frugt" },
  { key: "body",       label: "Krop" },
  { key: "acidity",    label: "Syre" },
  { key: "tannin",     label: "Tannin" },
];

type Tab = "sektion" | "scores";

export default function AdminPage() {
  const [tab,           setTab]           = useState<Tab>("sektion");
  const [wines,         setWines]         = useState<Wine[]>([]);
  const [sektioner,     setSektioner]     = useState<string[]>([]);
  const [search,        setSearch]        = useState("");
  const [filterSektion, setFilterSektion] = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState<Record<number, boolean>>({});
  const [edited,        setEdited]        = useState<Record<number, string>>({});
  const [editedScores,  setEditedScores]  = useState<Record<number, Partial<Record<ScoreField, string>>>>({});

  const fetchWines = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)        params.set("q", search);
    if (filterSektion) params.set("sektion", filterSektion);
    if (filterType)    params.set("wine_type_filter", filterType);
    const res = await fetch(`${API}/api/admin/wines?${params}`);
    const data = await res.json();
    setWines(data.wines ?? []);
    setSektioner(data.sektioner ?? []);
    setEdited({});
    setEditedScores({});
    setLoading(false);
  }, [search, filterSektion, filterType]);

  useEffect(() => { fetchWines(); }, [fetchWines]);

  async function saveSektion(wine: Wine) {
    const newSektion = edited[wine.id] !== undefined ? edited[wine.id] : (wine.sektion ?? "");
    setSaving(s => ({ ...s, [wine.id]: true }));
    await fetch(`${API}/api/admin/wines/${wine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sektion: newSektion || null }),
    });
    setWines(ws => ws.map(w => w.id === wine.id ? { ...w, sektion: newSektion || null } : w));
    setEdited(e => { const n = { ...e }; delete n[wine.id]; return n; });
    setSaving(s => ({ ...s, [wine.id]: false }));
  }

  async function saveScores(wine: Wine) {
    const changes = editedScores[wine.id] ?? {};
    if (!Object.keys(changes).length) return;
    setSaving(s => ({ ...s, [wine.id]: true }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(changes)) {
      if (k === "wine_type") { body[k] = v || null; }
      else { body[k] = v === "" ? null : parseInt(v); }
    }
    await fetch(`${API}/api/admin/wines/${wine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setWines(ws => ws.map(w => w.id === wine.id ? { ...w, ...body } as Wine : w));
    setEditedScores(e => { const n = { ...e }; delete n[wine.id]; return n; });
    setSaving(s => ({ ...s, [wine.id]: false }));
  }

  async function toggleIsNew(wine: Wine) {
    const newVal = !wine.is_new;
    await fetch(`${API}/api/admin/wines/${wine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_new: newVal }),
    });
    setWines(ws => ws.map(w => w.id === wine.id ? { ...w, is_new: newVal } : w));
  }

  function setScore(wineId: number, field: ScoreField, val: string) {
    setEditedScores(prev => ({
      ...prev,
      [wineId]: { ...(prev[wineId] ?? {}), [field]: val },
    }));
  }

  function getScore(wine: Wine, field: ScoreField): string {
    const edited = editedScores[wine.id]?.[field];
    if (edited !== undefined) return edited;
    const v = wine[field];
    return v == null ? "" : String(v);
  }

  const uassigned = wines.filter(w => !w.sektion).length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "0 auto", padding: "32px 20px", color: "#1a1a1a" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Vinifera Admin</h1>
        <a href="/" style={{ marginLeft: "auto", fontSize: 13, color: "#888", textDecoration: "none" }}>← Tilbage til appen</a>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "2px solid #eee" }}>
        {([["sektion", "📍 Sektion-editor"], ["scores", "⭐ Smagsscorer"]] as [Tab, string][]).map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 18px", border: "none", background: "none", cursor: "pointer",
            fontSize: 14, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "#1a1a1a" : "#888",
            borderBottom: tab === t ? "2px solid #1a1a1a" : "2px solid transparent",
            marginBottom: -2,
          }}>{lbl}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Søg på navn eller producent..."
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
        />
        {tab === "sektion" && (
          <select value={filterSektion} onChange={e => setFilterSektion(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, minWidth: 220 }}>
            <option value="">Alle sektioner</option>
            <option value="__none__">Ikke tildelt ({uassigned})</option>
            {sektioner.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {tab === "scores" && (
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, minWidth: 200 }}>
            <option value="">Alle typer</option>
            <option value="Mousserende">🥂 Champagne & Mousserende</option>
            <option value="Rødvin">Rødvin</option>
            <option value="Hvidvin">Hvidvin</option>
            <option value="Rosévin">Rosévin</option>
            <option value="Dessertvin">Dessertvin</option>
            <option value="Portvin">Portvin</option>
          </select>
        )}
      </div>

      {/* Sektion section chips */}
      {tab === "sektion" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {SEKTIONER.map(s => {
            const count = wines.filter(w => w.sektion === s).length;
            return (
              <button key={s} onClick={() => setFilterSektion(filterSektion === s ? "" : s)} style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                background: filterSektion === s ? "#1a1a1a" : "#f0f0f0",
                color: filterSektion === s ? "#fff" : "#555",
                border: "none", fontWeight: 500,
              }}>
                {s} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? <p style={{ color: "#888" }}>Henter vine...</p> : (
        <>
          {/* ── SEKTION TAB ── */}
          {tab === "sektion" && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "35%" }}>Vin</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "12%" }}>Type</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "10%" }}>Land</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "8%" }}>Pris</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "22%" }}>Sektion</th>
                  <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "6%", textAlign: "center" }}>NY</th>
                  <th style={{ padding: "10px 8px", width: "8%" }}></th>
                </tr>
              </thead>
              <tbody>
                {wines.map(wine => {
                  const currentVal = edited[wine.id] !== undefined ? edited[wine.id] : (wine.sektion ?? "");
                  const isDirty = edited[wine.id] !== undefined;
                  return (
                    <tr key={wine.id} style={{ borderBottom: "1px solid #f0f0f0", background: isDirty ? "#fffbf0" : "transparent" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{wine.title}</div>
                        {wine.producer && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{wine.producer}</div>}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#555" }}>{wine.wine_type ?? "—"}</td>
                      <td style={{ padding: "10px 8px", color: "#555" }}>{wine.country ?? "—"}</td>
                      <td style={{ padding: "10px 8px", color: "#555" }}>{wine.price_dkk ? `${wine.price_dkk} kr` : "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        <select value={currentVal} onChange={e => setEdited(prev => ({ ...prev, [wine.id]: e.target.value }))}
                          style={{ width: "100%", padding: "6px 8px", border: `1px solid ${isDirty ? "#f5a623" : "#ddd"}`, borderRadius: 6, fontSize: 13, background: isDirty ? "#fffbf0" : "#fff" }}>
                          <option value="">— ikke tildelt —</option>
                          {SEKTIONER.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        <input type="checkbox" checked={!!wine.is_new} onChange={() => toggleIsNew(wine)}
                          style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#d97706" }} />
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {isDirty && (
                          <button onClick={() => saveSektion(wine)} disabled={saving[wine.id]} style={{
                            padding: "6px 14px", background: "#1a1a1a", color: "#fff",
                            border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
                            opacity: saving[wine.id] ? 0.5 : 1,
                          }}>
                            {saving[wine.id] ? "..." : "Gem"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── SCORES TAB ── */}
          {tab === "scores" && (
            <>
              <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                Scores 1–5. Lad feltet stå tomt for "ikke angivet". Klik Gem for at gemme en vin.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
                    <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "28%" }}>Vin</th>
                    <th style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "14%" }}>Type</th>
                    {SCORE_FIELDS.map(f => (
                      <th key={f.key} style={{ padding: "10px 8px", fontWeight: 600, color: "#555", width: "8%", textAlign: "center" }}>{f.label}</th>
                    ))}
                    <th style={{ padding: "10px 8px", width: "8%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {wines.map(wine => {
                    const hasEdits = !!editedScores[wine.id] && Object.keys(editedScores[wine.id]).length > 0;
                    const editedType = (editedScores[wine.id] as Record<string, string> | undefined)?.wine_type;
                    const currentType = editedType !== undefined ? editedType : (wine.wine_type ?? "");
                    const typeEdited = editedType !== undefined;
                    return (
                      <tr key={wine.id} style={{ borderBottom: "1px solid #f0f0f0", background: hasEdits ? "#fffbf0" : wine.wine_type ? "transparent" : "#fff5f5" }}>
                        <td style={{ padding: "10px 8px" }}>
                          <div style={{ fontWeight: 600, lineHeight: 1.3 }}>{wine.title}</div>
                          {wine.producer && <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{wine.producer}</div>}
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <select
                            value={currentType}
                            onChange={e => setEditedScores(prev => ({ ...prev, [wine.id]: { ...(prev[wine.id] ?? {}), wine_type: e.target.value } }))}
                            style={{
                              width: "100%", padding: "4px 6px", borderRadius: 6, fontSize: 12,
                              border: `1px solid ${typeEdited ? "#f5a623" : wine.wine_type ? "#ddd" : "#e53"}`,
                              background: typeEdited ? "#fffbf0" : wine.wine_type ? "#fff" : "#fff0f0",
                            }}
                          >
                            <option value="">— mangler —</option>
                            {["Rødvin","Hvidvin","Rosévin","Mousserende","Champagne","Doux","Portvin","Dessertvin","Sherry","Hedvin","Cognac","Calvados","Snaps","Rom","Vodka","Armagnac","Grappa","Tequila","Likør","Gin","Whisky","Aperitif","Alkoholfri","Alkoholreduceret"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        {SCORE_FIELDS.map(f => (
                          <td key={f.key} style={{ padding: "6px 8px", textAlign: "center" }}>
                            <select
                              value={getScore(wine, f.key)}
                              onChange={e => setScore(wine.id, f.key, e.target.value)}
                              style={{
                                width: 52, padding: "4px 4px", borderRadius: 6, fontSize: 13, textAlign: "center",
                                border: `1px solid ${editedScores[wine.id]?.[f.key] !== undefined ? "#f5a623" : "#ddd"}`,
                                background: editedScores[wine.id]?.[f.key] !== undefined ? "#fffbf0" : "#fff",
                              }}
                            >
                              <option value="">—</option>
                              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        ))}
                        <td style={{ padding: "10px 8px" }}>
                          {hasEdits && (
                            <button onClick={() => saveScores(wine)} disabled={saving[wine.id]} style={{
                              padding: "6px 14px", background: "#1a1a1a", color: "#fff",
                              border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
                              opacity: saving[wine.id] ? 0.5 : 1,
                            }}>
                              {saving[wine.id] ? "..." : "Gem"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      {!loading && wines.length === 0 && <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Ingen vine fundet.</p>}
      <p style={{ marginTop: 20, fontSize: 12, color: "#aaa" }}>Viser {wines.length} vine</p>
    </div>
  );
}
