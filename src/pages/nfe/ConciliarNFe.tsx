import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

type NFeRow = {
  chave_acesso: string;
  emitente: string | null;
  destinatario: string | null;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  valor_total: number | null;
  total_parcelas?: number | null;
  diferenca?: number | null;
};

export default function ConciliarNFe() {
  const [pendentes, setPendentes] = useState<NFeRow[]>([]);
  const [conciliadas, setConciliadas] = useState<NFeRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const p1 = supabase.from("vw_nfe_pendentes").select("*").limit(200);
      const p2 = supabase.from("vw_nfe_conciliada").select("*").limit(200);
      const [{ data: dp, error: ep }, { data: dc, error: ec }] = await Promise.all([p1, p2]);
      if (ep) throw ep;
      if (ec) throw ec;
      setPendentes(dp || []);
      setConciliadas(dc || []);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto" }}>
      <h1>Conciliação NFe</h1>
      {loading ? <p>Carregando…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <section>
            <h2>Pendentes</h2>
            <List data={pendentes} empty="Sem pendentes" />
          </section>
          <section>
            <h2>Conciliadas</h2>
            <List data={conciliadas} empty="Sem conciliadas" />
          </section>
        </div>
      )}
    </div>
  );
}

function List({ data, empty }: { data: NFeRow[]; empty: string }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ background: "#fafafa" }}>
          <tr>
            <th style={th}>Chave</th>
            <th style={th}>Número/Série</th>
            <th style={th}>Emissão</th>
            <th style={th}>Emitente</th>
            <th style={th}>Destinatário</th>
            <th style={th}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.chave_acesso}>
              <td style={td} title={r.chave_acesso}>{r.chave_acesso}</td>
              <td style={td}>{(r.numero || "-") + "/" + (r.serie || "-")}</td>
              <td style={td}>{r.data_emissao ?? "-"}</td>
              <td style={td}>{r.emitente ?? "-"}</td>
              <td style={td}>{r.destinatario ?? "-"}</td>
              <td style={td}>{fmtBRL(r.valor_total ?? 0)}</td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#777" }}>{empty}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function fmtBRL(n: number) {
  return Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
