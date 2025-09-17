import React from "react";

export default function Configuracoes() {
  return (
    <div style={wrap}>
      <h1>Sistema — Configurações</h1>
      <div style={box}>
        <p>TODO: parâmetros do sistema, preferências, chaves externas.</p>
      </div>
    </div>
  );
}
const wrap: React.CSSProperties = { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 900, margin: "0 auto" };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 8, padding: 12 };
