import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type Recorrente = {
  id: number;
  filial_id: number | null;
  credor_id: number | null;
  descricao: string;
  valor: number;
  dia_vencimento: number;
  ativo: boolean;
  criado_em: string;
};

export default function RecorrentesList() {
  const [rows, setRows] = useState<Recorrente[]>([]);
  const [q, setQ] = useState("");
  const [ativo, setAtivo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  async function load() {
    try {
      setLoading(true);
      let qy = supabase.from("recorrentes").select("*").order("id", { ascending: false }).limit(200);
      if (ativo === "sim") qy = qy.eq("ativo", true);
      if (ativo === "nao") qy = qy.eq("ativo", false);
      const { data, error } = await qy;
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [ativo]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      r.descricao.toLowerCase().includes(s) ||
      String(r.filial_id ?? "").includes(s) ||
      String(r.credor_id ?? "").includes(s)
    );
  }, [rows, q]);

  async function onDelete(id: number) {
    if (!confirm("Excluir este recorrente?")) return;
    const { error } = await supabase.from("recorrentes").delete().eq("id", id);
    if (error) alert("Erro ao excluir: " + error.message);
    else load();
  }

  async function gerarMesAtual() {
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth() + 1;
    // tenta RPC; se não existir, avisa
    const { error } = await supabase.rpc("gerar_recorrentes", { ano, mes });
    if (error) {
      alert("Não foi possível chamar gerar_recorrentes (RPC). Se a função não existir, podemos criar depois.\n\nDetalhe: " + error.message);
    } else {
      alert("Geração concluída para " + mes.toString().padStart(2, "0") + "/" + ano);
      // opcional: abrir log
      nav("/recorrentes/log");
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 1200, margin: "0 auto" }}>
      <h1>Recorrentes</h1>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <input
          placeholder="Buscar por descrição, filial, credor"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={inp}
        />
        <select value={ativo} onChange={(e) => setAtivo(e.target.value)} style={{ ...inp, width: 160 }}>
          <option value="">Ativo (todos)</option>
          <option value="sim">Apenas ativos</option>
          <option value="nao">Apenas inativos</option>
        </select>
        <Link to="/recorrentes/nova" style={btnPrimary}>+ Novo</Link>
        <button onClick={gerarMesAtual} style={btnBlue}>Gerar mês atual</button>
        <Link to="/recorrentes/log" style={btnOutline}>Ver Log</Link>
      </div>

      {loading ? <p>Carregando…</p> : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Filial</th>
                <th style={th}>Credor</th>
                <th style={th}>Descrição</th>
                <th style={th}>Valor</th>
                <th style={th}>Dia</th>
                <th style={th}>Ativo</th>
                <th style={th}>Criado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.filial_id ?? "-"}</td>
                  <td style={td}>{r.credor_id ?? "-"}</td>
                  <td style={td}>{r.descricao}</td>
                  <td style={td}>{fmtBRL(r.valor)}</td>
                  <td style={td}>{r.dia_vencimento}</td>
                  <td style={td}>{r.ativo ? "Sim" : "Não"}</td>
                  <td style={td}>{new Date(r.criado_em).toLocaleString()}</td>
                  <td style={tdRight}>
                    <Link to={`/recorrentes/${r.id}`} style={btnOutline}>Editar</Link>
                    <button onClick={() => onDelete(r.id)} style={{ ...btnOutline, borderColor: "#ef4444", color: "#ef4444" }}>Excluir</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "#777" }}>Nada encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function fmtBRL(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const tdRight: React.CSSProperties = { ...td, textAlign: "right", whiteSpace: "nowrap" };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, marginLeft: 6, cursor: "pointer" };
const btnPrimary: React.CSSProperties = { background: "black", color: "white", padding: "8px 12px", borderRadius: 8, textDecoration: "none" };
const btnBlue: React.CSSProperties = { background: "#2563eb", color: "white", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer" };
