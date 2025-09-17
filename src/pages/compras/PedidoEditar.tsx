import React from "react";
import { Link, useParams } from "react-router-dom";

export default function PedidoEditar() {
  const { id } = useParams();
  const isEdit = !!id;
  return (
    <div style={wrap}>
      <div style={{ marginBottom: 12 }}><Link to="/compras/pedidos">← Voltar</Link></div>
      <h1>{isEdit ? `Editar Pedido #${id}` : "Novo Pedido"}</h1>
      <div style={box}>
        <p>TODO: formulário de pedido (fornecedor, itens, total, status).</p>
      </div>
    </div>
  );
}
const wrap: React.CSSProperties = { padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 900, margin: "0 auto" };
const box: React.CSSProperties = { border: "1px solid #eee", borderRadius: 8, padding: 12 };
