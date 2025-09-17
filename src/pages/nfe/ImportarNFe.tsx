import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { Link } from "react-router-dom";

/**
 * ImportarNFe
 * - Lê um XML de NFe (layout nacional) localmente (FileReader + DOMParser)
 * - Extrai campos principais e upsert em public.nfe_data
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

      // helpers
      const get = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent || "";
      const num = (tag: string) => Number((get(tag) || "0").replace(",", "."));
      const safe = (s: string) => (s ?? "").trim();

      // campos principais (layout NFe)
      const chave = safe(get("chNFe")) || safe(get("Id")).replace("NFe", "");
      if (!chave || chave.length !== 44) throw new Error("Não foi possível obter a chave de acesso (44 dígitos).");

      const numero = safe(get("nNF"));
      const serie = safe(get("serie"));
      const modelo = safe(get("mod"));
      const emissao = safe(get("dhEmi") || get("dEmi")); // dhEmi é ISO datetime; dEmi é date
      const data_emissao = emissao ? emissao.slice(0, 10) : null;

      // emitente/destinatário (razao social ou nome)
      const emitente = safe(get("xNome")) || safe(xml.getElementsByTagName("emit")[0]?.getElementsByTagName("xNome")[0]?.textContent || "");
      const destNode = xml.getElementsByTagName("dest")[0];
      const destinatario = safe(destNode?.getElementsByTagName("xNome")[0]?.textContent || destNode?.getElementsByTagName("xFant")[0]?.textContent || "");

      // valores totais
      const vNF = num("vNF");      // valor total da NFe
      const vProd = num("vProd");  // valor produtos
      const vDesc = num("vDesc");  // descontos
      const vFrete = num("vFrete");
      const vOutro = num("vOutro");

      // upsert em nfe_data
      const payload = {
        chave_acesso: chave,
        numero,
        serie,
        modelo,
        data_emissao,
        emitente,
        destinatario,
        valor_total: vNF || null,
        valores: {
          total: vNF || null,
          produtos: vProd || null,
          desconto: vDesc || null,
          frete: vFrete || null,
          outros: vOutro || null
        }
      };

      // upsert (usar ON CONFLICT em supabase: insert + onConflict + ignore=merge)
      // supabase-js v2: upsert(table, payload, { onConflict })
      const { error } = await supabase
        .from("nfe_data")
        .upsert(payload, { onConflict: "chave_acesso" });

      if (error) throw error;

      setResultado(`NFe ${numero}/${serie} (chave ${chave}) importada/atualizada com sucesso.`);
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
      <p style={{ color: "#666" }}>Selecione um arquivo XML de NFe (modelo nacional). O sistema extrai a chave de acesso, número/série, data de emissão e valores totais.</p>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <input type="file" accept=".xml" onChange={onFile} />
        <button
          onClick={importar}
          disabled={!file || busy}
          style={{ background: "#111", color: "white", borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer", width: 200 }}
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
