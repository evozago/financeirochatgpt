import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type NFePend = {
  chave_acesso: string;
  emitente: string | null;
  destinatario: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  valores?: any;
  valor_total?: number | null;
};

type NFeConc = {
  chave_acesso: string;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  emitente: string | null;
  destinatario: string | null;
  total_nfe: number | null;
  total_parcelas: number | null;
  qtd_parcelas: number | null;
  diferenca: number | null;
};

export default function ConciliarNFe() {
  const [pendentes, setPendentes] = useState<NFePend[]>([]);
  const [conciliadas, setConciliadas] = useState<NFeConc[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const [{ data: dp, error: ep }, { data: dc, error: ec }] = await Promise.all([
        supabase.from("vw_nfe_pendentes").select("*").limit(200),
        supabase.from("vw_nfe_conciliada").select("*").limit(200),
      ]);
      if (ep) throw ep;
      if (ec) throw ec;
      setPendentes((dp ?? []) as any);
      setConciliadas((dc ?? []) as any);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function conciliarCriandoConta(chave: string) {
    try {
      setBusy(chave);
      // nossa função: fn_conciliar_nfe(p_chave text, p_conta_id bigint, p_criar_conta boolean)
      const { error } = await supabase.rpc("fn_conciliar_nfe", {
        p_chave: chave,
        p_conta_id: null,
        p_criar_conta: true,
      });
      if (error) throw error;
      await load();
      alert("Conciliado criando conta automaticamente.");
    } catch (e: any) {
      alert("Erro ao conciliar: " + e.message);
    } finally {
      setBusy(null);
    }
  }

  async function conciliarEmConta(chave: string) {
    const txt = prompt("Informe o ID da conta_pagar_corporativas para conciliar esta NFe:");
    if (!txt) return;
    const contaId = Number(txt);
    if (!contaId || Number.isNaN(contaId)) return alert("ID inválido.");

    try {
      setBusy(chave);
      const { error } = await supabase.rpc("fn_conciliar_nfe", {
        p_chave: chave,
        p_conta_id: contaId,
        p_criar_conta: false,
      });
      if (error) throw error;
      await load();
      alert("Conciliado na conta #" + contaId);
    } catch (e: any) {
      alert("Erro ao conciliar: " + e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Conciliação NFe</h1>
      {loading ? <p>Carregando…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <section>
            <h2>Pendentes</h2>
            <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={th}>Chave</th>
                    <th style={th}>Nº/Série</th>
                    <th style={th}>Emissão</th>
                    <th style={th}>Emitente</th>
                    <th style={th}>Valor</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {pendentes.map((r) => (
                    <tr key={r.chave_acesso}>
                      <td style={td} title={r.chave_acesso}>
                        {r.chave_acesso.slice(0, 6)}…{r.chave_acesso.slice(-6)}
                      </td>
                      <td style={td}>{(r.numero || "-") + "/" + (r.serie || "-")}</td>
                      <td style={td}>{r.data_emissao ?? "-"}</td>
                      <td style={td}>{r.emitente ?? "-"}</td>
                      <td style={td}>{fmtBRL(r.valor_total ?? (r as any)?.valores?.total ?? 0)}</td>
                      <td style={tdRight}>
                        <button
                          disabled={busy === r.chave_acesso}
                          onClick={() => conciliarCriandoConta(r.chave_acesso)}
                          style={btnBlue}
                          title="Cria a conta e vincula esta NFe"
                        >
                          {busy === r.chave_acesso ? "Processando…" : "Criar conta + conciliar"}
                        </button>
                        <button
                          disabled={busy === r.chave_acesso}
                          onClick={() => conciliarEmConta(r.chave_acesso)}
                          style={btnOutline}
                          title="Vincula a uma conta existente"
                        >
                          Conciliar em conta
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendentes.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem pendentes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2>Conciliadas</h2>
            <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#fafafa" }}>
                  <tr>
                    <th style={th}>Chave</th>
                    <th style={th}>Nº/Série</th>
                    <th style={th}>Emissão</th>
                    <th style={th}>Emitente</th>
                    <th style={th}>NFe</th>
                    <th style={th}>Parcelas</th>
                    <th style={th}>Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {conciliadas.map((r) => (
                    <tr key={r.chave_acesso}>
                      <td style={td} title={r.chave_acesso}>
                        {r.chave_acesso.slice(0, 6)}…{r.chave_acesso.slice(-6)}
                      </td>
                      <td style={td}>{(r.numero || "-") + "/" + (r.serie || "-")}</td>
                      <td style={td}>{r.data_emissao ?? "-"}</td>
                      <td style={td}>{r.emitente ?? "-"}</td>
                      <td style={td}>{fmtBRL(r.total_nfe ?? 0)}</td>
                      <td style={td}>{fmtBRL(r.total_parcelas ?? 0)} ({r.qtd_parcelas ?? 0})</td>
                      <td style={td}>{fmtBRL(r.diferenca ?? 0)}</td>
                    </tr>
                  ))}
                  {conciliadas.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem conciliadas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function fmtBRL(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer", marginLeft: 8 };
const btnBlue: React.CSSProperties = { background: "#2563eb", color: "white", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer" };
