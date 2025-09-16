import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

type Conta = {
  id: number;
  filial_id: number;
  descricao: string;
  status: string;
  dt_vencimento: string | null;
  valor_total: number;
  criado_em: string;
};

export default function ContasLista() {
  const [rows, setRows] = useState<Conta[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contas_pagar_corporativas")
      .select("*")
      .order("id", { ascending: false })
      .limit(200);
    if (error) alert(error.message);
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.descricao.toLowerCase().includes(s) ||
      (r.status || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto" }}>
      <h1>Contas a Pagar</h1>
      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <input
          placeholder="Buscar por descrição/status"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
        />
      </div>
      {loading ? <p>Carregando…</p> : (
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
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.filial_id}</td>
                  <td style={td}>{r.descricao}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td}>{r.dt_vencimento ?? "-"}</td>
                  <td style={td}>{Number(r.valor_total).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
                  <td style={tdRight}>
                    <button onClick={() => nav(`/financeiro/contas/${r.id}`)} style={btn}>Detalhe</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#777" }}>Nada encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const btn: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer" };
