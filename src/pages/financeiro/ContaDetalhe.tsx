import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { findById, fromTable } from "../../services/api";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const c = await findById<Conta>("contas_pagar_corporativas", id!);
        setConta(c);
        const p = await fromTable<Parcela>(
          "parcelas_conta_pagar",
          "*",
          (q: any) => q.eq("conta_pagar_id", id).order("num_parcela", {ascending:true})
        );
        setParcelas(p);
      } catch (e: any) {
        alert("Erro ao carregar: " + e.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/financeiro/contas">← Voltar</Link>
      </div>
      <h1>Conta #{id}</h1>

      {loading && <p>Carregando…</p>}
      {!loading && !conta && <p>Conta não encontrada.</p>}

      {conta && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
            <div><b>Filial:</b><br />{conta.filial_id}</div>
            <div><b>Status:</b><br />{conta.status}</div>
            <div><b>Vencimento:</b><br />{conta.dt_vencimento ?? "-"}</div>
            <div style={{ gridColumn: "1 / -1" }}>
              <b>Descrição:</b><br />{conta.descricao}
            </div>
            <div><b>Valor Total:</b><br />
              {Number(conta.valor_total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
            </div>
          </div>

          <h2>Parcelas</h2>
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
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
                {parcelas.length === 0 &&
                  <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem parcelas</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
