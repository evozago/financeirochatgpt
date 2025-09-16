import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fromTable } from "../../services/api";

/** Tipagem básica da tabela de cabeçalho */
type Conta = {
  id: number;
  filial_id: number;
  descricao: string;
  status: "aberta" | "parcial" | "paga" | "cancelada";
  dt_vencimento: string | null;
  valor_total: number;
  criado_em: string;
};

export default function ContasLista() {
  // dados
  const [rows, setRows] = useState<Conta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // filtros
  const [q, setQ] = useState<string>("");                 // busca texto (descricao/status)
  const [filial, setFilial] = useState<string>("");       // filial_id
  const [status, setStatus] = useState<string>("");       // status
  const [ini, setIni] = useState<string>("");             // dt_vencimento >= ini
  const [fim, setFim] = useState<string>("");             // dt_vencimento <= fim

  const nav = useNavigate();

  // debouncer simples para busca
  const debouncedQ = useDebounce(q, 350);

  async function load() {
    try {
      setLoading(true);
      const data = await fromTable<Conta>(
        "contas_pagar_corporativas",
        "*",
        (q: any) => {
          // busca textual (descricao)
          if (debouncedQ.trim()) {
            q = q.ilike("descricao", `%${debouncedQ.trim()}%`);
          }
          // filial
          if (filial.trim()) {
            const n = Number(filial.trim());
            if (!Number.isNaN(n)) q = q.eq("filial_id", n);
          }
          // status
          if (status) q = q.eq("status", status);
          // período por dt_vencimento
          if (ini) q = q.gte("dt_vencimento", ini);
          if (fim) q = q.lte("dt_vencimento", fim);

          return q.order("id", { ascending: false }).limit(200);
        }
      );
      setRows(data);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  // carrega sempre que filtros mudarem
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debouncedQ, filial, status, ini, fim]);

  const totalSelecionado = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r.valor_total || 0), 0),
    [rows]
  );

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 16 }}>Contas a Pagar</h1>

      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 160px 160px 160px", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Buscar por descrição"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={inp}
        />
        <input
          placeholder="Filial"
          value={filial}
          onChange={(e) => setFilial(e.target.value)}
          style={inp}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
          <option value="">Status (todos)</option>
          <option value="aberta">aberta</option>
          <option value="parcial">parcial</option>
          <option value="paga">paga</option>
          <option value="cancelada">cancelada</option>
        </select>
        <input
          type="date"
          value={ini}
          onChange={(e) => setIni(e.target.value)}
          style={inp}
          placeholder="Venc. de"
        />
        <input
          type="date"
          value={fim}
          onChange={(e) => setFim(e.target.value)}
          style={inp}
          placeholder="Venc. até"
        />
      </div>

      {/* Resumo simples */}
      <div style={{ marginBottom: 12, color: "#444", fontSize: 14 }}>
        {loading ? "Carregando…" : `${rows.length} conta(s) — Total: ${fmtBRL(totalSelecionado)}`}
      </div>

      {/* Tabela */}
      {loading ? (
        <p>Carregando…</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Filial</th>
                <th style={th}>Descrição</th>
                <th style={th}>Status</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Valor</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.filial_id}</td>
                  <td style={td}>{r.descricao}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td}>{r.dt_vencimento ?? "-"}</td>
                  <td style={td}>{fmtBRL(r.valor_total)}</td>
                  <td style={tdRight}>
                    <button onClick={() => nav(`/financeiro/contas/${r.id}`)} style={btn}>
                      Detalhe
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#777" }}>
                    Nada encontrado com os filtros atuais
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* helpers UI */
function fmtBRL(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* debouncer simples p/ busca */
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* estilos pequenos reutilizáveis */
const th: React.CSSProperties = {
  textAlign: "left",
  padding: 10,
  borderBottom: "1px solid #eee",
  fontWeight: 600,
  fontSize: 13,
};
const td: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #f5f5f5",
  fontSize: 14,
};
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
const btn: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer" };
