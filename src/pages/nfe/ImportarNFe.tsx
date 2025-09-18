import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

/** Tipos de apoio */
type Dup = {
  num_dup: string | null;
  data_venc: string;       // yyyy-MM-dd
  valor: number;
  status_target: string;   // 'a_vencer' | 'paga'
  pago_em?: string | null; // yyyy-MM-dd
};

export default function ImportarNFe() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  // Estado para manual quando XML não traz duplicatas
  const [manualMode, setManualMode] = useState(false);
  const [manualChave, setManualChave] = useState<string>("");
  const [manualValorTotal, setManualValorTotal] = useState<number>(0);
  const [manualQtd, setManualQtd] = useState<number>(2);
  const [manualQuitado, setManualQuitado] = useState<boolean>(false);
  const [manualBaseDate, setManualBaseDate] = useState<string>(""); // padrão data_emissao
  const [manualRows, setManualRows] = useState<Dup[]>([]);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null);
    setResultado(null);
  }

  /** Utilitários */
  const safe = (s: string) => (s ?? "").trim();

  function nAsNumber(x: string | null | undefined) {
    if (!x) return 0;
    const t = String(x).replace(",", ".");
    const n = Number(t);
    return Number.isNaN(n) ? 0 : n;
  }

  function getTag(tag: string, ctx: Element | Document) {
    return (ctx as any).getElementsByTagName(tag)?.[0]?.textContent || "";
  }
  function getAll(tag: string, ctx: Element | Document) {
    const nodes = (ctx as any).getElementsByTagName(tag);
    const arr: Element[] = [];
    for (let i = 0; i < nodes.length; i++) arr.push(nodes[i]);
    return arr;
  }

  /** Cria array de duplicatas manuais (rateio igual + mensal) */
  function gerarManualInicial(valorTotal: number, qtd: number, primeiraData: string, quitado: boolean): Dup[] {
    const base = new Date(primeiraData);
    if (Number.isNaN(base.getTime())) return [];
    const val = Math.round((valorTotal / Math.max(qtd, 1)) * 100) / 100;
    const rows: Dup[] = [];
    for (let i = 0; i < qtd; i++) {
      const d = new Date(base);
      d.setMonth(d.getMonth() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      rows.push({
        num_dup: String(i + 1).padStart(3, "0"),
        data_venc: `${yyyy}-${mm}-${dd}`,
        valor: val,
        status_target: quitado ? "paga" : "a_vencer",
        pago_em: quitado ? `${yyyy}-${mm}-${dd}` : null,
      });
    }
    // Ajuste de centavos se necessário
    const soma = rows.reduce((acc, r) => acc + r.valor, 0);
    const diff = Math.round((valorTotal - soma) * 100) / 100;
    if (Math.abs(diff) >= 0.01) rows[rows.length - 1].valor = Math.round((rows[rows.length - 1].valor + diff) * 100) / 100;
    return rows;
  }

  const manualTotal = useMemo(() => {
    return manualRows.reduce((acc, r) => acc + (r.valor || 0), 0);
  }, [manualRows]);

  /** Importa XML e grava duplicatas; se não houver duplicatas, abre modo manual */
  async function importar() {
    if (!file) return alert("Selecione um arquivo XML da NFe");
    try {
      setBusy(true);
      setResultado(null);
      setManualMode(false);

      const xmlText = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const ide  = xml.getElementsByTagName("ide")[0] || xml;
      const emit = xml.getElementsByTagName("emit")[0];
      const dest = xml.getElementsByTagName("dest")[0];

      // chave 44
      let chave = safe(getTag("chNFe", xml));
      if (!chave) {
        const infNFe = xml.getElementsByTagName("infNFe")[0];
        const id = infNFe?.getAttribute("Id") || "";
        if (id?.startsWith("NFe")) chave = id.slice(3);
      }
      if (!chave || chave.length !== 44) throw new Error("Chave de acesso inválida (44 dígitos).");

      const numero = safe(getTag("nNF", ide));
      const serie  = safe(getTag("serie", ide));
      const modelo = safe(getTag("mod", ide));

      const dtEmi = safe(getTag("dhEmi", ide) || getTag("dEmi", ide));
      const data_emissao = dtEmi ? dtEmi.slice(0, 10) : null;

      const emitente      = safe(getTag("xNome", emit) || getTag("xFant", emit));
      const cnpj_emitente = safe(getTag("CNPJ", emit));
      const destinatario      = safe(getTag("xNome", dest) || getTag("xFant", dest));
      const cnpj_destinatario = safe(getTag("CNPJ", dest));

      const vNF   = nAsNumber(getTag("vNF", xml));
      const vProd = nAsNumber(getTag("vProd", xml));
      const vDesc = nAsNumber(getTag("vDesc", xml));
      const vFrete= nAsNumber(getTag("vFrete", xml));
      const vOutro= nAsNumber(getTag("vOutro", xml));

      // Duplicatas do XML
      const duplicatas: Dup[] = [];
      const cobr = xml.getElementsByTagName("cobr")[0];
      const dupNodes = cobr ? getAll("dup", cobr) : getAll("dup", xml);
      dupNodes.forEach((d, i) => {
        const nDup  = safe(getTag("nDup", d));
        const dVenc = safe(getTag("dVenc", d));
        const vDup  = nAsNumber(getTag("vDup", d));
        if (dVenc && vDup > 0) {
          duplicatas.push({
            num_dup: nDup || String(i + 1).padStart(3, "0"),
            data_venc: dVenc,
            valor: vDup,
            status_target: "a_vencer",
            pago_em: null,
          });
        }
      });

      // sobe XML
      const xmlPath = `xml/${chave}.xml`;
      const { error: upErr } = await supabase.storage.from("nfe-xml").upload(
        xmlPath,
        new Blob([xmlText], { type: "text/xml" }),
        { upsert: true, cacheControl: "60" }
      );
      if (upErr && upErr.message && !upErr.message.includes("The resource already exists")) throw upErr;

      // upsert em nfe_data
      const payload = {
        chave_acesso: chave,
        emitente: emitente || null,
        destinatario: destinatario || null,
        numero: numero || null,
        serie: serie || null,
        modelo: modelo || null,
        data_emissao,
        valor_total: vNF || null,
        cnpj_emitente: cnpj_emitente || null,
        cnpj_destinatario: cnpj_destinatario || null,
        valores: {
          total: vNF || null,
          produtos: vProd || null,
          desconto: vDesc || null,
          frete: vFrete || null,
          outros: vOutro || null,
          xml_path: xmlPath,
          duplicatas_qtd: duplicatas.length
        }
      };
      const { error: upsertErr } = await supabase.from("nfe_data").upsert(payload, { onConflict: "chave_acesso" });
      if (upsertErr) throw upsertErr;

      // limpa duplicatas desta chave
      const { error: delErr } = await supabase.from("nfe_duplicatas").delete().eq("chave_acesso", chave);
      if (delErr) throw delErr;

      if (duplicatas.length > 0) {
        // salva duplicatas do XML
        const rows = duplicatas.map((d) => ({
          chave_acesso: chave,
          num_dup: d.num_dup,
          data_venc: d.data_venc,
          valor: d.valor,
          status_target: d.status_target,
          pago_em: d.pago_em || null
        }));
        const { error: insErr } = await supabase.from("nfe_duplicatas").insert(rows, { upsert: true });
        if (insErr) throw insErr;

        setResultado(`NFe ${numero || "-"} / ${serie || "-"} importada. ${rows.length} duplicata(s) gravada(s).`);
        setManualMode(false);
        return;
      }

      // se não veio duplicata → modo manual
      setManualMode(true);
      setManualChave(chave);
      setManualValorTotal(vNF || 0);
      setManualQtd(2);
      setManualQuitado(false);
      setManualBaseDate(data_emissao || new Date().toISOString().slice(0, 10));
      setManualRows(
        gerarManualInicial(vNF || 0, 2, data_emissao || new Date().toISOString().slice(0, 10), false)
      );
      setResultado(`NFe ${numero || "-"} / ${serie || "-"} importada sem duplicatas. Informe as parcelas manualmente.`);
    } catch (e: any) {
      setResultado("Erro ao importar: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  /** Regenera a grade manual quando qtd/base/quitado mudar */
  useEffect(() => {
    if (!manualMode) return;
    setManualRows(
      gerarManualInicial(manualValorTotal || 0, Math.max(manualQtd, 1), manualBaseDate || new Date().toISOString().slice(0, 10), manualQuitado)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualQtd, manualBaseDate, manualQuitado]);

  /** Salva duplicatas manuais em nfe_duplicatas */
  async function salvarManual() {
    try {
      if (!manualChave || manualRows.length === 0) return;
      setBusy(true);
      setResultado(null);

      // substitui duplicatas da chave
      const { error: delErr } = await supabase.from("nfe_duplicatas").delete().eq("chave_acesso", manualChave);
      if (delErr) throw delErr;

      const rows = manualRows.map((r, i) => ({
        chave_acesso: manualChave,
        num_dup: r.num_dup || String(i + 1).padStart(3, "0"),
        data_venc: r.data_venc,
        valor: r.valor,
        status_target: r.status_target,
        pago_em: r.status_target === "paga" ? (r.pago_em || r.data_venc) : null
      }));

      const { error: insErr } = await supabase.from("nfe_duplicatas").insert(rows, { upsert: true });
      if (insErr) throw insErr;

      setResultado(`${rows.length} duplicata(s) gravada(s) para a chave ${manualChave}. Agora concilie a NFe.`);
      setManualMode(false);
    } catch (e: any) {
      setResultado("Erro ao salvar duplicatas: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  /** UI */
  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 12, display: "flex", gap: 12 }}>
        <Link to="/nfe/conciliar">→ Ir para conciliação</Link>
      </div>

      <h1>Importar NFe (XML)</h1>
      <p style={{ color: "#666" }}>
        O sistema grava a NFe em <code>nfe_data</code> e as duplicatas em <code>nfe_duplicatas</code>. Se o XML não tiver duplicatas, você poderá
        informar manualmente as parcelas (com opção de marcar como quitadas).
      </p>

      <div style={{ display: manualMode ? "none" : "grid", gap: 12, marginTop: 12 }}>
        <input type="file" accept=".xml" onChange={onFile} />
        <button onClick={importar} disabled={!file || busy} style={btnPrimary}>
          {busy ? "Importando..." : "Importar XML"}
        </button>
      </div>

      {/* Modo manual quando XML não trouxe duplicatas */}
      {manualMode && (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid #eee", borderRadius: 8 }}>
          <h3>Duplicatas manual — chave: <code>{manualChave}</code></h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, margin: "12px 0" }}>
            <div>
              <label>Total (R$)</label>
              <input
                type="number"
                step="0.01"
                value={manualValorTotal}
                onChange={(e) => setManualValorTotal(Number(e.target.value || 0))}
                style={ipt}
              />
            </div>
            <div>
              <label>Qtd. parcelas</label>
              <input
                type="number"
                min={1}
                value={manualQtd}
                onChange={(e) => setManualQtd(Math.max(1, Number(e.target.value || 1)))}
                style={ipt}
              />
            </div>
            <div>
              <label>1º vencimento</label>
              <input
                type="date"
                value={manualBaseDate}
                onChange={(e) => setManualBaseDate(e.target.value)}
                style={ipt}
              />
            </div>
            <div style={{ display: "flex", alignItems: "end" }}>
              <label style={{ display: "flex", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={manualQuitado}
                  onChange={(e) => setManualQuitado(e.target.checked)}
                />
                Marcar parcelas como quitadas
              </label>
            </div>
          </div>

          {/* Grade editável */}
          <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#fafafa" }}>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>Nº Dup</th>
                  <th style={th}>Vencimento</th>
                  <th style={th}>Valor</th>
                  <th style={th}>Status</th>
                  <th style={th}>Pago em</th>
                </tr>
              </thead>
              <tbody>
                {manualRows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>
                      <input
                        value={r.num_dup ?? ""}
                        onChange={(e) => {
                          const rows = [...manualRows];
                          rows[idx].num_dup = e.target.value || null;
                          setManualRows(rows);
                        }}
                        style={ipt}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        value={r.data_venc}
                        onChange={(e) => {
                          const rows = [...manualRows];
                          rows[idx].data_venc = e.target.value;
                          setManualRows(rows);
                        }}
                        style={ipt}
                      />
                    </td>
                    <td style={td}>
                      <input
                        type="number"
                        step="0.01"
                        value={r.valor}
                        onChange={(e) => {
                          const rows = [...manualRows];
                          rows[idx].valor = Number(e.target.value || 0);
                          setManualRows(rows);
                        }}
                        style={ipt}
                      />
                    </td>
                    <td style={td}>
                      <select
                        value={r.status_target}
                        onChange={(e) => {
                          const rows = [...manualRows];
                          rows[idx].status_target = e.target.value;
                          if (rows[idx].status_target !== "paga") rows[idx].pago_em = null;
                          setManualRows(rows);
                        }}
                        style={ipt}
                      >
                        <option value="a_vencer">a_vencer</option>
                        <option value="paga">paga</option>
                      </select>
                    </td>
                    <td style={td}>
                      <input
                        type="date"
                        disabled={r.status_target !== "paga"}
                        value={r.pago_em || ""}
                        onChange={(e) => {
                          const rows = [...manualRows];
                          rows[idx].pago_em = e.target.value || null;
                          setManualRows(rows);
                        }}
                        style={{ ...ipt, opacity: r.status_target === "paga" ? 1 : 0.5 }}
                      />
                    </td>
                  </tr>
                ))}
                {manualRows.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem linhas</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={salvarManual} disabled={busy} style={btnPrimary}>
              {busy ? "Salvando..." : "Salvar duplicatas"}
            </button>
            <button onClick={() => { setManualMode(false); setResultado("Cancelado."); }} style={btnOutline}>
              Cancelar
            </button>
            <div style={{ marginLeft: "auto", color: "#666" }}>
              Total atual: <b>{manualTotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</b>
            </div>
          </div>
        </div>
      )}

      {resultado && <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>{resultado}</div>}
    </div>
  );
}

/* estilos */
const ipt: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: 6 };
const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", width: 220 };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "8px 12px", borderRadius: 8, cursor: "pointer" };
