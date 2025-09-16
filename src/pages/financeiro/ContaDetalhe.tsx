import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link, useParams } from "react-router-dom";

type Conta = {
  id: number;
  filial_id: number;
  descricao: string;
  status: string;
  dt_emissao: string | null;
  dt_vencimento: string | null;
  valor_total: number;
  observacoes: string | null;
};

type Parcela = {
  id: number;
  conta_pagar_id: number;
  num_parcela: number;
  data_vencimento: string;
  valor_parcela: number;
  status: string;
  pago_em: string | null;
};

export default function ContaDetalhe() {
  const { id } = useParams();
  const [conta, setConta] = useState<Conta | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);

  useEffect(() => {
    async function load() {
      const { data: c } = await supabase
        .from("contas_pagar_corporativas")
        .select("*").eq("id", id).single();
      setConta(c || null);

      const { data: p } = await supabase
        .from("parcelas_conta_pagar")
        .select("*").eq("conta_pagar_id", id).order("num_parcela",{ascending:true});
      setParcelas(p || []);
    }
    load();
  }, [id]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/financeiro/contas">← Voltar</Link>
      </div>
      <h1>Conta #{id}</h1>
      {!conta ? <p>Carregando…</p> : (
        <>
          <p><b>Filial:</b> {conta.filial_id}</p>
          <p><b>Descrição:</b> {conta.descricao}</p>
          <p><b>Status:</b> {conta.status}</p>
          <p><b>Vencimento:</b> {conta.dt_vencimento ?? "-"}</p>
          <p><b>Valor Total:</b> {Number(conta.valor_total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</p>
          <h2>Parcelas</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>Parcela</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Valor</th>
                <th style={th}>Status</th>
                <th style={th}>Pago em</th>
              </tr>
            </thead>
            <tbody>
              {parcelas.map(p => (
                <tr key={p.id}>
                  <td style={td}>{p.num_parcela}</td>
                  <td style={td}>{p.data_vencimento}</td>
                  <td style={td}>{Number(p.valor_parcela).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                  <td style={td}>{p.status}</td>
                  <td style={td}>{p.pago_em ?? "-"}</td>
                </tr>
              ))}
              {parcelas.length === 0 && <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem parcelas</td></tr>}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
