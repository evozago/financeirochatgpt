import React from "react";

export default function FornecedoresList() {
  return (
    <div style={wrap}>
      <h1>Compras — Fornecedores</h1>
      <div style={box}>
        <p>TODO: listar fornecedores e cadastrar/editar.</p>
      </div>
    </div>
  );
}
const wrap: React.CSSProperties = { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 8, padding: 12 };
