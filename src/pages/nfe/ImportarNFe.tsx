import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

/**
 * ImportarNFe
 * - Lê um XML de NFe localmente (FileReader + DOMParser)
 * - Extrai: chave (44), número, série, modelo, data_emissao, emitente, destinatario, valor_total
 * - Faz upload do XML no Storage 'nfe-xml' em xml/<chave>.xml (private)
 * - Upsert em nfe_data (onConflict: chave_acesso)
 */
export default function ImportarNFe() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResultado(null);
  }

  async function importar() {
    if (!file) return alert("Selecione um arquivo XML da NFe");

    try {
      setBusy(true);
      setResultado(null);

      const xmlText = await file.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, "text/xml");

      const get = (tag: string, ctx?: Element | Document) =>
        (ctx ?? xml).getElementsByTagName(tag)[0]?.textContent || "";
      const num = (tag: string, ctx?: Element | Document) =>
        Number((get(tag, ctx) || "0").replace(",", "."));
      const safe = (s: string) => (s ?? "").trim();

      // chave de acesso (44)
      let chave = safe(get("chNFe"));
      if (!chave) {
        // alguns XML trazem no Id do infNFe: Id="NFe3519..."
        const infNFe = xml.getElementsByTagName("infNFe")[0];
        const id = infNFe?.getAttribute("Id") || "";
        if (id?.startsWith("NFe")) chave = id.slice(3);
      }
      if (!chave || chave.length !== 44) throw new Error("Chave de acesso inválida (esperado 44 dígitos).");

      // dados principais
      const nfe = xml.getElementsByTagName("NFe")[0] || xml;
      const ide = xml.getElementsByTagName("ide")[0] || xml;
      const emit = xml.getElementsByTagName("emit")[0];
      const dest = xml.getElementsByTagName("dest")[0];

      const numero = safe(get("nNF", ide));
      const serie = safe(get("serie", ide));
      const modelo = safe(get("mod", ide));
      const dtEmi = safe(get("dhEmi", ide) || get("dEmi", ide));
      const data_emissao = dtEmi ? dtEmi.slice(0, 10) : null;

      const emitente = safe(get("xNome", emit) || get("xFant", emit));
      const destinatario = safe(get("xNome", dest) || get("xFant", dest));

      const vNF   = num("vNF", xml);     // total da NFe
      const vProd = num("vProd", xml);
      const vDesc = num("vDesc", xml);
      const vFrete= num("vFrete", xml);
      const vOutro= num("vOutro", xml);

      // Upload do XML no Storage (nfe-xml/xml/<chave>.xml) — sobrescreve (upsert)
      const xmlPath = `xml/${chave}.xml`;
      const { error: upErr } = await supabase.storage.from("nfe-xml").upload(xmlPath, new Blob([xmlText], { type: "text/xml" }), {
        upsert: true,
        cacheControl: "60"
      });
      if (upErr && upErr.message && !upErr.message.includes("The resource already exists")) throw upErr;

      // Upsert em nfe_data
      const payload = {
        chave_acesso: chave,
        emitente: emitente || null,
        destinatario: destinatario || null,
        numero: numero || null,
        serie: serie || null,
        modelo: modelo || null,
        data_emissao,
        valor_total: vNF || null,
        valores: {
          total: vNF || null,
          produtos: vProd || null,
          desconto: vDesc || null,
          frete: vFrete || null,
          outros: vOutro || null,
          xml_path: xmlPath
        }
      };

      const { error } = await supabase
        .from("nfe_data")
        .upsert(payload, { onConflict: "chave_acesso" });
      if (error) throw error;

      setResultado(`NFe ${numero || "-"} / ${serie || "-"} (chave ${chave}) importada/atualizada com sucesso.`);
    } catch (err: any) {
      setResultado("Erro ao importar: " + err.message);
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
      <p style={{ color: "#666" }}>Selecione o XML da NFe. O sistema extrai os campos principais, envia o XML ao Storage e grava/atualiza em <code>nfe_data</code>.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input type="file" accept=".xml" onChange={onFile} />
        <button
          onClick={importar}
          disabled={!file || busy}
          style={{ background: "#111", color: "white", borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer", width: 220 }}
        >
          {busy ? "Importando..." : "Importar XML"}
        </button>
      </div>

      {resultado && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          {resultado}
        </div>
      )}
    </div>
  );
}
