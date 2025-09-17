import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type Meta = {
  id: number;
  entidade_id: number;     // vendedor
  ano: number;
  mes: number;             // 1..12
  valor_meta: number;
  criado_em: string;
};

export default function MetasList() {
  const [rows, setRows] = useState<Meta[]>([]);
  const [qEntidade, setQEntidade] = useState<string>("");
  const [ano, setAno] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  async function load() {
    try {
      setLoading(true);
      let q = supabase.from("metas_mensais").select("*").order("id", { ascending: false }).limit(200);
      if (qEntidade.trim()) {
        const n = Number(qEntidade.trim());
        if (!Number.isNaN(n)) q = q.eq("entidade_id", n);
      }
      if (ano.trim()) {
        const n = Number(ano.trim());
        if (!Number.isNaN(n)) q = q.eq("ano", n);
      }
      if (mes.trim()) {
        const n = Number(mes.trim());
        if (!Number.isNaN(n)) q = q.eq("mes", n);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [qEntidade, ano, mes]);

  const totalMeta = useMemo(() => rows.reduce((acc, r) => acc + Number(r.valor_meta || 0), 0), [rows]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Metas Mensais</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 160px", gap: 12, margin: "12px 0" }}>
        <input placeholder="Entidade (ID)" value={qEntidade} onChange={(e) => setQEntidade(e.target.value)} style={inp} />
        <input placeholder="Ano" value={ano} onChange={(e) => setAno(e.target.value)} style={inp} />
        <input placeholder="Mês (1-12)" value={mes} onChange={(e) => setMes(e.target.value)} style={inp} />
        <Link to="/metas/nova" style={btnPrimary}>+ Nova Meta</Link>
      </div>

      <div style={{ marginBottom: 12, color: "#444", fontSize: 14 }}>
        {loading ? "Carregando…" : `${rows.length} meta(s) — Total meta: ${fmtBRL(totalMeta)}`}
      </div>

      {loading ? <p>Carregando…</p> : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Entidade</th>
                <th style={th}>Ano</th>
                <th style={th}>Mês</th>
                <th style={th}>Meta</th>
                <th style={th}>Criado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.entidade_id}</td>
                  <td style={td}>{r.ano}</td>
                  <td style={td}>{r.mes}</td>
                  <td style={td}>{fmtBRL(r.valor_meta)}</td>
                  <td style={td}>{new Date(r.criado_em).toLocaleString()}</td>
                  <td style={tdRight}>
                    <button onClick={() => nav(`/metas/${r.id}`)} style={btnOutline}>Editar</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#777" }}>Nada encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtBRL(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { background: "black", color: "white", padding: "8px 12px", borderRadius: 8, textDecoration: "none" };
