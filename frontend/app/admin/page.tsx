"use client";

import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const SEKTIONER = [
  "Reol 1 - Hylde 1",
  "Reol 1 - Hylde 2",
  "Reol 1 - Hylde 3",
  "Reol 1 - Hylde 4",
  "Reol 1 - Hylde 5",
  "Reol 1 - Hylde 6",
  "Reol 2 - Hylde 1",
  "Reol 2 - Hylde 2",
  "Reol 2 - Hylde 3",
  "Reol 2 - Hylde 4",
  "Reol 2 - Hylde 5",
  "Reol 3 - Hojre - Hylde 2",
  "Reol 3 - Hojre - Hylde 3",
  "Reol 3 - Hojre - Hylde 4",
  "Reol 3 - Venstre",
  "Hvid Reol",
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
};

export default function AdminPage() {
  const [wines, setWines]         = useState<Wine[]>([]);
  const [sektioner, setSektioner] = useState<string[]>([]);
  const [search, setSearch]       = useState("");
  const [filterSektion, setFilterSektion] = useState("");
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState<Record<number, boolean>>({});
  const [edited, setEdited]       = useState<Record<number, string>>({});

  const fetchWines = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (filterSektion) params.set("sektion", filterSektion);
    const res = await fetch(`${API}/api/admin/wines?${params}`);
    const data = await res.json();
    setWines(data.wines ?? []);
    setSektioner(data.sektioner ?? []);
    setEdited({});
    setLoading(false);
  }, [search, filterSektion]);

  useEffect(() => { fetchWines(); }, [fetchWines]);

  async function saveSektion(wine: Wine) {
    const newSektion = edited[wine.id] !== undefined ? edited[wine.id] : (wine.sektion ?? "");
    setSaving((s) => ({ ...s, [wine.id]: true }));
    await fetch(`${API}/api/admin/wines/${wine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sektion: newSektion || null }),
    });
    setWines((ws) => ws.map((w) => w.id === wine.id ? { ...w, sektion: newSektion || null } : w));
    setEdited((e) => { const n = { ...e }; delete n[wine.id]; return n; });
    setSaving((s) => ({ ...s, [wine.id]: false }));
  }

  async function toggleIsNew(wine: Wine) {
    const newVal = !wine.is_new;
    await fetch(`${API}/api/admin/wines/${wine.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_new: newVal }),
    });
    setWines((ws) => ws.map((w) => w.id === wine.id ? { ...w, is_new: newVal } : w));
  }

  const uassigned = wines.filter((w) => !w.sektion).length;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 1100, margin: "0 auto", padding: "32px 20px", color: "#1a1a1a" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Vinifera Admin</h1>
        <span style={{ fontSize: 13, color: "#666" }}>Sektion-editor</span>
        <a href="/" style={{ marginLeft: "auto", fontSize: 13, color: "#888", textDecoration: "none" }}>← Tilbage til appen</a>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg på navn eller producent..."
          style={{ flex: 1, minWidth: 220, padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }}
        />
        <select
          value={filterSektion}
          onChange={(e) => setFilterSektion(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, minWidth: 220 }}
        >
          <option value="">Alle sektioner</option>
          <option value="__none__">Ikke tildelt ({uassigned})</option>
          {sektioner.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        {SEKTIONER.map((s) => {
          const count = wines.filter((w) => w.sektion === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterSektion(filterSektion === s ? "" : s)}
              style={{
                padding: "4px 10px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                background: filterSektion === s ? "#1a1a1a" : "#f0f0f0",
                color: filterSektion === s ? "#fff" : "#555",
                border: "none", fontWeight: 500,
              }}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: "#888" }}>Henter vine...</p>
      ) : (
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
            {wines.map((wine) => {
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
                    <select
                      value={currentVal}
                      onChange={(e) => setEdited((prev) => ({ ...prev, [wine.id]: e.target.value }))}
                      style={{
                        width: "100%", padding: "6px 8px", border: `1px solid ${isDirty ? "#f5a623" : "#ddd"}`,
                        borderRadius: 6, fontSize: 13, background: isDirty ? "#fffbf0" : "#fff",
                      }}
                    >
                      <option value="">— ikke tildelt —</option>
                      {SEKTIONER.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "10px 8px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!wine.is_new}
                      onChange={() => toggleIsNew(wine)}
                      title="Markér som ny i sortimentet"
                      style={{ cursor: "pointer", width: 16, height: 16, accentColor: "#d97706" }}
                    />
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    {isDirty && (
                      <button
                        onClick={() => saveSektion(wine)}
                        disabled={saving[wine.id]}
                        style={{
                          padding: "6px 14px", background: "#1a1a1a", color: "#fff",
                          border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer",
                          opacity: saving[wine.id] ? 0.5 : 1,
                        }}
                      >
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

      {!loading && wines.length === 0 && (
        <p style={{ color: "#888", textAlign: "center", marginTop: 40 }}>Ingen vine fundet.</p>
      )}

      <p style={{ marginTop: 20, fontSize: 12, color: "#aaa" }}>
        Viser {wines.length} vine · {uassigned} uden sektion
      </p>
    </div>
  );
}
