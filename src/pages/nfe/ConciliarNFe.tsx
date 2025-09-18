import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type NFePend = {
  chave_acesso: string;
  emitente: string | null;
  destinatario: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  valor_total?: number | null;
  valores?: any;
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

type ContaLinkRow = {
  chave_acesso: string;
  parcelas_conta_pagar?: { conta_pagar_id: number } | null;
};

export default function ConciliarNFe() {
  const [pendentes, setPendentes] = useState<NFePend[]>([]);
  const [conciliadas, setConciliadas] = useState<NFeConc[]>([]);
  const [contaMap, setContaMap] = useState<Record<string, number>>({}); // chave_acesso -> conta_pagar_id
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setMsg(null);
      const [{ data: dp, error: ep }, { data: dc, error: ec }] = await Promise.all([
        supabase.from("vw_nfe_pendentes").select("*").limit(400),
        supabase.from("vw_nfe_conciliada").select("*").limit(400),
      ]);
      if (ep) throw ep;
      if (ec) throw ec;

      setPendentes(((dp ?? []) as any) || []);
      const conc = ((dc ?? []) as any) as NFeConc[];
      setConciliadas(conc);

      // buscar conta_pagar_id para as chaves conciliadas
      const keys = conc.map((r) => r.chave_acesso).filter(Boolean);
      await buildContaMap(keys);
    } catch (e: any) {
      setMsg("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function buildContaMap(chaves: string[]) {
    setContaMap({});
    if (!chaves || chaves.length === 0) return;

    // Busca os vínculos -> conta_pagar_id pela relação com parcelas
    // PostgREST: nfe_parcela_link (chave_acesso, parcela_id) + embed parcelas_conta_pagar
    const { data, error } = await supabase
      .from("nfe_parcela_link")
      .select("chave_acesso, parcelas_conta_pagar!inner(conta_pagar_id)")
      .in("chave_acesso", Array.from(new Set(chaves)));

    if (error) {
      setMsg("Erro ao buscar contas vinculadas: " + error.message);
      return;
    }

    const map: Record<string, number> = {};
    (data as ContaLinkRow[]).forEach((row) => {
      const contaId = row?.parcelas_conta_pagar?.conta_pagar_id;
      if (row.chave_acesso && typeof contaId === "number") {
        // prioriza o primeiro que encontrar
        if (!map[row.chave_acesso]) map[row.chave_acesso] = contaId;
      }
    });
    setContaMap(map);
  }

  useEffect(() => {
    load();
  }, []);

  async function conciliarCriandoConta(chave: string) {
    try {
      setBusyKey(chave);
      setMsg(null);

      const { data, error } = await supabase.rpc("fn_conciliar_nfe", {
        p_chave: chave,
        p_conta_id: null,
        p_criar_conta: true,
      });
      if (error) throw error;

      const r = normalizeReturn(data);
      setMsg(r.msg);
      await load();
    } catch (e: any) {
      setMsg("Erro ao conciliar: " + e.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function conciliarEmConta(chave: string) {
    const s = prompt("Informe o ID da conta (contas_pagar_corporativas) para conciliar:");
    if (!s) return;
    const contaId = Number(s);
    if (!contaId || Number.isNaN(contaId)) {
      return alert("ID inválido.");
    }

    try {
      setBusyKey(chave);
      setMsg(null);
      const { data, error } = await supabase.rpc("fn_conciliar_nfe", {
        p_chave: chave,
        p_conta_id: contaId,
        p_criar_conta: false,
      });
      if (error) throw error;

      const r = normalizeReturn(data);
      setMsg(r.msg);
      await load();
    } catch (e: any) {
      setMsg("Erro ao conciliar: " + e.message);
    } finally {
      setBusyKey(null);
    }
  }

  const concWithConta = useMemo(() => {
    return conciliadas.map((c) => ({
      ...c,
      conta_id: contaMap[c.chave_acesso],
    }));
  }, [conciliadas, contaMap]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1300, margin: "0 auto" }}>
      <h1>Conciliação NFe</h1>
      {msg && (
        <div style={{ margin: "12px 0", padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          {/* Pendentes */}
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
                      <td style={td} title={r.chave_acesso}>{shortKey(r.chave_acesso)}</td>
                      <td style={td}>{(r.numero || "-") + "/" + (r.serie || "-")}</td>
                      <td style={td}>{r.data_emissao ?? "-"}</td>
                      <td style={td}>{r.emitente ?? "-"}</td>
                      <td style={td}>{fmtBRL(r.valor_total ?? (r as any)?.valores?.total ?? 0)}</td>
                      <td style={tdRight}>
                        <button
                          disabled={busyKey === r.chave_acesso}
                          onClick={() => conciliarCriandoConta(r.chave_acesso)}
                          style={btnPrimary}
                          title="Cria conta e vincula esta NFe"
                        >
                          {busyKey === r.chave_acesso ? "Processando…" : "Criar conta + conciliar"}
                        </button>
                        <button
                          disabled={busyKey === r.chave_acesso}
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

          {/* Conciliadas */}
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
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {concWithConta.map((r) => (
                    <tr key={r.chave_acesso}>
                      <td style={td} title={r.chave_acesso}>{shortKey(r.chave_acesso)}</td>
                      <td style={td}>{(r.numero || "-") + "/" + (r.serie || "-")}</td>
                      <td style={td}>{r.data_emissao ?? "-"}</td>
                      <td style={td}>{r.emitente ?? "-"}</td>
                      <td style={td}>{fmtBRL(r.total_nfe ?? 0)}</td>
                      <td style={td}>{fmtBRL(r.total_parcelas ?? 0)} ({r.qtd_parcelas ?? 0})</td>
                      <td style={td}>{fmtBRL(r.diferenca ?? 0)}</td>
                      <td style={tdRight}>
                        {r.conta_id ? (
                          <Link to={`/financeiro/contas/${r.conta_id}`} style={btnLink}>
                            Abrir conta #{r.conta_id}
                          </Link>
                        ) : (
                          <span style={{ color: "#999" }}>sem conta</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {conciliadas.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem conciliadas</td></tr>
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

/* Helpers */
function normalizeReturn(data: any) {
  const row = Array.isArray(data) ? data[0] : data;
  const ok = !!row?.ok;
  const msg = String(row?.msg ?? "");
  const conta_id = row?.conta_id ?? null;
  return { ok, msg, conta_id };
}
function fmtBRL(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function shortKey(k: string) {
  if (!k) return "-";
  return `${k.slice(0, 6)}…${k.slice(-6)}`;
}

/* estilos */
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const btnPrimary: React.CSSProperties = { background: "#2563eb", color: "#fff", padding: "8px 12px", border: "none", borderRadius: 8, cursor: "pointer", marginRight: 8 };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer" };
const btnLink: React.CSSProperties = { color: "#2563eb", textDecoration: "none", fontWeight: 600 };
