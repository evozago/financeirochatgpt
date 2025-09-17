import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";

type ResumoRow = {
  entidade_id: number | null;
  ano: number;
  mes: number; // 1..12
  valor_meta: number | null;
  total_vendido: number | null;
  atingimento_percentual: number | null;
};

type PivotCell = { meta: number; vend: number; perc: number | null };

export default function ResumoMetas() {
  // filtros
  const anoAtual = new Date().getFullYear();
  const [entidadeId, setEntidadeId] = useState<string>("");        // ID de entidade (opcional)
  const [anosCsv, setAnosCsv] = useState<string>(`${anoAtual-1},${anoAtual}`); // ex.: "2024,2025"

  // loading e dados
  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<ResumoRow[]>([]);

  // parse anos
  const anosSelecionados = useMemo<number[]>(() => {
    const parts = anosCsv
      .split(",")
      .map(s => Number(s.trim()))
      .filter(n => !Number.isNaN(n) && n >= 2000 && n <= 2100);
    // fallback: ano atual
    return parts.length ? Array.from(new Set(parts)) : [anoAtual];
  }, [anosCsv, anoAtual]);

  async function load() {
    try {
      setLoading(true);
      let q = supabase.from("vw_metas_vendas_resumo").select("*").in("ano", anosSelecionados);
      if (entidadeId.trim()) {
        const n = Number(entidadeId.trim());
        if (!Number.isNaN(n)) q = q.eq("entidade_id", n);
      }
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as ResumoRow[]);
    } catch (e: any) {
      alert("Erro ao carregar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entidadeId, anosSelecionados.join(",")]);

  // agrega por ano/mês somando várias entidades (se filtro de entidade não estiver aplicado)
  const pivot = useMemo(() => {
    const result = new Map<number, Map<number, PivotCell>>(); // ano -> mes -> cell
    for (const r of rows) {
      const ano = r.ano;
      const mes = r.mes;
      const meta = Number(r.valor_meta ?? 0);
      const vend = Number(r.total_vendido ?? 0);
      if (!result.has(ano)) result.set(ano, new Map());
      const row = result.get(ano)!;
      const prev = row.get(mes) ?? { meta: 0, vend: 0, perc: null };
      const metaSum = prev.meta + meta;
      const vendSum = prev.vend + vend;
      const perc = metaSum > 0 ? round2((vendSum / metaSum) * 100) : null;
      row.set(mes, { meta: metaSum, vend: vendSum, perc });
    }
    return result;
  }, [rows]);

  // anos presentes no pivot (ordenados)
  const anos = useMemo(() => {
    return Array.from(pivot.keys()).sort((a, b) => a - b);
  }, [pivot]);

  // totais do filtro (para indicadores)
  const indicadores = useMemo(() => {
    let meta = 0, vend = 0;
    for (const [, meses] of pivot) {
      for (const [, cell] of meses) {
        meta += cell.meta;
        vend += cell.vend;
      }
    }
    return {
      totalMeta: meta,
      totalVend: vend,
      perc: meta > 0 ? round2((vend / meta) * 100) : null
    };
  }, [pivot]);

  // paleta simples por atingimento
  function bgColor(perc: number | null) {
    if (perc === null) return "transparent";
    if (perc >= 100) return "#e6ffed";       // verde claro
    if (perc >= 80)  return "#fff8e6";       // amarelo claro
    return "#ffecec";                        // vermelho claro
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1300, margin: "0 auto" }}>
      <h1>Dashboard — Metas x Vendas</h1>

      {/* FILTROS */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 360px 160px", gap: 12, margin: "16px 0" }}>
        <div>
          <label style={lbl}>Entidade (ID) — opcional</label>
          <input
            value={entidadeId}
            onChange={(e) => setEntidadeId(e.target.value)}
            placeholder="ex.: 10"
            style={inp}
          />
        </div>
        <div>
          <label style={lbl}>Anos (separe por vírgula)</label>
          <input
            value={anosCsv}
            onChange={(e) => setAnosCsv(e.target.value)}
            placeholder="ex.: 2024,2025"
            style={inp}
          />
        </div>
        <div style={{ alignSelf: "end" }}>
          <button onClick={load} style={btnPrimary} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {/* INDICADORES GERAIS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <Card title="Meta total (filtro)" value={fmtBRL(indicadores.totalMeta)} />
        <Card title="Vendido total (filtro)" value={fmtBRL(indicadores.totalVend)} />
        <Card title="Atingimento geral" value={indicadores.perc === null ? "—" : `${indicadores.perc}%`} />
      </div>

      {/* TABELA COMPARATIVA MÊS A MÊS / ANO A ANO */}
      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#fafafa" }}>
            <tr>
              <th style={thFixed}>Ano</th>
              {Array.from({ length: 12 }).map((_, i) => (
                <th key={i+1} style={th}>{`M${String(i+1).padStart(2, "0")}`}</th>
              ))}
              <th style={th}>Meta (ano)</th>
              <th style={th}>Vendido (ano)</th>
              <th style={th}>Ating. (ano)</th>
            </tr>
          </thead>
          <tbody>
            {anos.map((ano) => {
              const meses = pivot.get(ano)!;
              let somaMeta = 0, somaVend = 0;
              const tds = [];
              for (let m = 1; m <= 12; m++) {
                const cell = meses.get(m) ?? { meta: 0, vend: 0, perc: null };
                somaMeta += cell.meta;
                somaVend += cell.vend;
                tds.push(
                  <td key={m} style={{ ...td, background: bgColor(cell.perc) }}>
                    <div style={{ fontWeight: 600 }}>{fmtBRL(cell.vend)}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>{fmtBRL(cell.meta)}</div>
                    <div style={{ color: "#111", fontSize: 12 }}>{cell.perc === null ? "—" : `${cell.perc}%`}</div>
                  </td>
                );
              }
              const anoPerc = somaMeta > 0 ? round2((somaVend / somaMeta) * 100) : null;
              return (
                <tr key={ano}>
                  <td style={tdFixed}>{ano}</td>
                  {tds}
                  <td style={{ ...td, fontWeight: 600 }}>{fmtBRL(somaMeta)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{fmtBRL(somaVend)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{anoPerc === null ? "—" : `${anoPerc}%`}</td>
                </tr>
              );
            })}
            {anos.length === 0 && (
              <tr><td colSpan={16} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem dados para os filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* componentes e helpers UI */
function Card({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
      <div style={{ color: "#6b7280", fontSize: 13 }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function fmtBRL(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const lbl: React.CSSProperties = { fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14, width: "100%" };
const btnPrimary: React.CSSProperties = { background: "#111", color: "white", padding: "10px 14px", borderRadius: 8, border: "none", cursor: "pointer" };

const th: React.CSSProperties = { textAlign: "center", padding: 8, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const thFixed: React.CSSProperties = { ...th, position: "sticky", left: 0, background: "#fafafa" };
const td: React.CSSProperties = { textAlign: "center", padding: 8, borderBottom: "1px solid #f5f5f5", fontSize: 13, whiteSpace: "nowrap" };
const tdFixed: React.CSSProperties = { ...td, position: "sticky", left: 0, background: "#fff", fontWeight: 600 };
