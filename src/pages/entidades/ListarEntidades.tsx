import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient"; // se usar default, mude import
import { Link, useNavigate } from "react-router-dom";

type Entidade = {
  id: number;
  nome: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  documento: string | null;
  ativo: boolean;
  criado_em: string;
};

export default function ListarEntidades() {
  const [rows, setRows] = useState<Entidade[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  async function load() {
    setLoading(true);
    const sel = supabase.from("entidades").select("*").order("id", { ascending: false }).limit(200);
    const { data, error } = await sel;
    if (error) { alert("Erro ao carregar: " + error.message); setLoading(false); return; }
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.nome.toLowerCase().includes(s) ||
      (r.documento || "").includes(s)
    );
  }, [rows, q]);

  async function onDelete(id: number) {
    if (!confirm("Excluir esta entidade?")) return;
    const { error } = await supabase.from("entidades").delete().eq("id", id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    setRows(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 1100, margin: "0 auto" }}>
      <h1>Entidades</h1>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <input
          placeholder="Buscar por nome/documento"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
        />
        <Link to="/entidades/nova" style={{ background: "black", color: "white", padding: "10px 14px", borderRadius: 8, textDecoration: "none" }}>
          + Nova
        </Link>
      </div>

      {loading ? <p>Carregando…</p> : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Nome</th>
                <th style={th}>Tipo</th>
                <th style={th}>Documento</th>
                <th style={th}>Ativo</th>
                <th style={th}>Criado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.nome}</td>
                  <td style={td}>{r.tipo_pessoa}</td>
                  <td style={td}>{r.documento || "-"}</td>
                  <td style={td}>{r.ativo ? "Sim" : "Não"}</td>
                  <td style={td}>{new Date(r.criado_em).toLocaleString()}</td>
                  <td style={tdRight}>
                    <button onClick={() => nav(`/entidades/${r.id}`)} style={btnOutline}>Editar</button>
                    <button onClick={() => onDelete(r.id)} style={{ ...btnOutline, borderColor: "#ef4444", color: "#ef4444" }}>Excluir</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#777" }}>Nada encontrado</td></tr>
              )}
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
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, marginLeft: 6, cursor: "pointer" };
