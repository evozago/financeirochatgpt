import React from "react";
import { Link } from "react-router-dom";

export default function PedidosList() {
  return (
    <div style={wrap}>
      <h1>Compras — Pedidos</h1>
      <div style={{ margin: "12px 0" }}>
        <Link to="/compras/pedidos/nova" style={btn}>+ Novo Pedido</Link>
      </div>
      <div style={box}>
        <p>TODO: listar pedidos, filtros por fornecedor/período/status, totais.</p>
      </div>
    </div>
  );
}
const wrap: React.CSSProperties = { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 8, padding: 12 };
const btn: React.CSSProperties = { background: "#111", color: "#fff", padding: "8px 12px", borderRadius: 8, textDecoration: "none" };
