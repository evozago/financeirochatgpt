import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { findById, fromTable } from "../../services/api";
import { supabase } from "../../supabaseClient";

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
  const nav = useNavigate();
  const [conta, setConta] = useState<Conta | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [loading, setLoading] = useState(true);
  const contaId = id!;

  async function carregarDados() {
    try {
      setLoading(true);
      const c = await findById<Conta>("contas_pagar_corporativas", contaId);
      setConta(c);
      const p = await fromTable<Parcela>(
        "parcelas_conta_pagar",
        "*",
        (q: any) => q.eq("conta_pagar_id", contaId).order("num_parcela", { ascending: true })
      );
      setParcelas(p);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contaId) carregarDados();
  }, [contaId]);

  async function marcarPago(parcelaId: number) {
    try {
      const { error } = await supabase
        .from("parcelas_conta_pagar")
        .update({ status: "pago", pago_em: new Date().toISOString().slice(0, 10) })
        .eq("id", parcelaId);
      if (error) throw error;
      await carregarDados();
    } catch (e: any) {
      alert("Erro ao marcar como pago: " + e.message);
    }
  }

  async function gerarParcelas() {
    if (!conta) return;
    const qtd = parseInt(prompt("Quantas parcelas deseja gerar? (ex.: 3, 6, 12)") || "0", 10);
    if (!qtd || qtd <= 0) return;

    try {
      const total = Number(conta.valor_total);
      const base = Math.floor((total / qtd) * 100) / 100;
      const inserts: any[] = [];
      let acumuladoCentavos = 0;

      for (let i = 1; i <= qtd; i++) {
        let valor = base;
        if (i === qtd) valor = Math.round(total * 100 - acumuladoCentavos) / 100;
        acumuladoCentavos += Math.round(valor * 100);

        const d = new Date(conta.dt_vencimento ?? new Date().toISOString().slice(0, 10));
        d.setMonth(d.getMonth() + (i - 1));
        const vencParcela = d.toISOString().slice(0, 10);

        inserts.push({
          conta_pagar_id: conta.id,
          num_parcela: i,
          data_vencimento: vencParcela,
          valor_parcela: valor,
          status: "a_vencer",
        });
      }

      const { error } = await supabase.from("parcelas_conta_pagar").insert(inserts);
      if (error) throw error;
      await carregarDados();
      alert("Parcelas geradas.");
    } catch (e: any) {
      alert("Erro ao gerar parcelas: " + e.message);
    }
  }

  function irParaAnexos() {
    nav(`/financeiro/contas/${contaId}/anexos`);
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/financeiro/contas">← Voltar</Link>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={irParaAnexos}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", background: "transparent", cursor: "pointer" }}
            title="Abrir anexos desta conta"
          >
            Anexos
          </button>
          <button
            onClick={gerarParcelas}
            style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "#2563eb", color: "white", cursor: "pointer" }}
            title="Gerar parcelas automaticamente"
          >
            Gerar Parcelas
          </button>
        </div>
      </div>

      <h1>Conta #{contaId}</h1>

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

            <div><b>Valor Total:</b><br />{Number(conta.valor_total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</div>
            <div style={{ gridColumn: "1 / -1" }}>
              <b>Observações:</b><br />{conta.observacoes ?? "-"}
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
                  <th style={th}></th>
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
                    <td style={td}>
                      {p.status !== "pago" && (
                        <button
                          onClick={() => marcarPago(p.id)}
                          style={{ padding: "6px 12px", borderRadius: 6, border: "none", background: "green", color: "white", cursor: "pointer" }}
                        >
                          Marcar Pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {parcelas.length === 0 &&
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem parcelas</td></tr>}
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
