import React from "react";

export default function Relatorios() {
  return (
    <div style={wrap}>
      <h1>Sistema — Relatórios</h1>
      <div style={box}>
        <p>TODO: relatórios e análises (PDF/CSV/Gráficos).</p>
      </div>
    </div>
  );
}
const wrap: React.CSSProperties = { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 8, padding: 12 };
