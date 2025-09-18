import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

export default function ImportarNFe() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResultado(null);
  }

  const safe = (s: string) => (s ?? "").trim();

  function nAsNumber(x: string | null | undefined) {
    if (!x) return 0;
    const t = String(x).replace(",", "."); // caso venha com vírgula
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

  async function importar() {
    if (!file) return alert("Selecione um arquivo XML da NFe");
    try {
      setBusy(true);
      setResultado(null);

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

      // Duplicatas: <cobr><dup> ou <dup> soltas
      // cada <dup> deve conter <nDup>, <dVenc>, <vDup>
      const duplicatas: { num_dup: string; data_venc: string; valor: number }[] = [];
      const cobr = xml.getElementsByTagName("cobr")[0];
      const dupNodes = cobr ? getAll("dup", cobr) : getAll("dup", xml);
      dupNodes.forEach((d) => {
        const nDup  = safe(getTag("nDup", d));
        const dVenc = safe(getTag("dVenc", d));
        const vDup  = nAsNumber(getTag("vDup", d));
        if (dVenc && vDup > 0) {
          duplicatas.push({ num_dup: nDup || null as any, data_venc: dVenc, valor: vDup });
        }
      });

      // storage: xml/<chave>.xml
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

      const { error: upsertErr } = await supabase
        .from("nfe_data")
        .upsert(payload, { onConflict: "chave_acesso" });
      if (upsertErr) throw upsertErr;

      // limpar duplicatas antigas e inserir as novas (se houver)
      const { error: delErr } = await supabase
        .from("nfe_duplicatas")
        .delete()
        .eq("chave_acesso", chave);
      if (delErr) throw delErr;

      if (duplicatas.length > 0) {
        const rows = duplicatas.map((d) => ({
          chave_acesso: chave,
          num_dup: d.num_dup || null,
          data_venc: d.data_venc,
          valor: d.valor
        }));

        const { error: insErr } = await supabase
          .from("nfe_duplicatas")
          .insert(rows, { upsert: true });
        if (insErr) throw insErr;
      }

      setResultado(
        `NFe ${numero || "-"} / ${serie || "-"} importada. Chave: ${chave}. ` +
        (duplicatas.length > 0 ? `${duplicatas.length} duplicata(s) registrada(s).` : `Sem duplicatas no XML.`)
      );
    } catch (e: any) {
      setResultado("Erro ao importar: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/nfe/conciliar">→ Ir para conciliação</Link>
      </div>
      <h1>Importar NFe (XML)</h1>
      <p style={{ color: "#666" }}>O sistema grava os CNPJs e as duplicatas (parcelas) para conciliação automática.</p>
      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input type="file" accept=".xml" onChange={onFile} />
        <button onClick={importar} disabled={!file || busy} style={{ background: "#111", color: "white", borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer", width: 220 }}>
          {busy ? "Importando..." : "Importar XML"}
        </button>
      </div>
      {resultado && <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>{resultado}</div>}
    </div>
  );
}
