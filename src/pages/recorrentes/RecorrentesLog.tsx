import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

type Log = { id: number; ano: number; mes: number; executado_em: string; total_gerado: number | null };

export default function RecorrentesLog() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("recorrentes_log").select("*").order("executado_em", { ascending: false }).limit(200);
      if (error) alert("Erro ao carregar log: " + error.message);
      else setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/recorrentes">← Voltar</Link>
      </div>
      <h1>Log de Geração</h1>
      {loading ? <p>Carregando…</p> : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Ano</th>
                <th style={th}>Mês</th>
                <th style={th}>Executado em</th>
                <th style={th}>Total gerado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.ano}</td>
                  <td style={td}>{String(r.mes).padStart(2, "0")}</td>
                  <td style={td}>{new Date(r.executado_em).toLocaleString()}</td>
                  <td style={td}>{r.total_gerado ?? 0}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem entradas</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
