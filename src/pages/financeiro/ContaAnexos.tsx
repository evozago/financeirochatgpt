import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listFiles, uploadFile, removeFile, getSignedUrl } from "../../services/storage";

type Obj = {
  name: string;
  id?: string;
  updated_at?: string | null;
  created_at?: string | null;
  last_accessed_at?: string | null;
  metadata?: { size?: number };
};

export default function ContaAnexos() {
  const { id } = useParams();
  const contaId = String(id ?? "");
  const prefix = `contas/${contaId}/`; // pasta por conta dentro do bucket

  const [objs, setObjs] = useState<Obj[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const items = await listFiles(prefix);
      setObjs(items);
    } catch (e: any) {
      alert("Erro ao listar: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (contaId) load();
  }, [contaId]);

  async function onUpload() {
    if (!sel) return alert("Escolha um arquivo");
    try {
      setBusy(true);
      // salva no caminho: contas/<id>/<timestamp>_<nome>
      const ts = Date.now();
      const path = `${prefix}${ts}_${sanitize(sel.name)}`;
      await uploadFile(path, sel);
      setSel(null);
      await load();
      alert("Upload ok!");
    } catch (e: any) {
      alert("Erro no upload: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(name: string) {
    if (!confirm("Excluir este arquivo?")) return;
    try {
      setBusy(true);
      await removeFile(`${prefix}${name}`);
      await load();
    } catch (e: any) {
      alert("Erro ao excluir: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(name: string) {
    try {
      const url = await getSignedUrl(`${prefix}${name}`);
      if (!url) return alert("Não foi possível gerar link.");
      window.open(url, "_blank");
    } catch (e: any) {
      alert("Erro ao gerar link: " + e.message);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to={`/financeiro/contas/${contaId}`}>← Voltar ao detalhe da conta</Link>
        <h1 style={{ margin: 0 }}>Anexos da Conta #{contaId}</h1>
      </div>

      {/* upload */}
      <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <input type="file" onChange={(e) => setSel(e.target.files?.[0] ?? null)} />
        <button
          disabled={!sel || busy}
          style={{ background: "#111", color: "white", borderRadius: 8, padding: "8px 12px", border: "none", cursor: "pointer" }}
          onClick={onUpload}
        >
          {busy ? "Enviando..." : "Enviar"}
        </button>
      </div>

      {/* lista */}
      {loading ? <p>Carregando…</p> : (
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}>Arquivo</th>
                <th style={th}>Tamanho</th>
                <th style={th}>Modificado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {objs.map((o) => (
                <tr key={o.name}>
                  <td style={td}>{o.name}</td>
                  <td style={td}>{fmtSize(o.metadata?.size)}</td>
                  <td style={td}>{o.updated_at ? new Date(o.updated_at).toLocaleString() : "-"}</td>
                  <td style={tdRight}>
                    <button onClick={() => onDownload(o.name)} style={btnOutline}>Download</button>
                    <button onClick={() => onRemove(o.name)} style={{ ...btnOutline, borderColor: "#ef4444", color: "#ef4444" }}>Excluir</button>
                  </td>
                </tr>
              ))}
              {objs.length === 0 && <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#777" }}>Sem anexos</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function sanitize(n: string) {
  return n.replace(/[^\w.\-]+/g, "_");
}
function fmtSize(n?: number) {
  if (!n && n !== 0) return "-";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

const th: React.CSSProperties = { textAlign: "left", padding: 10, borderBottom: "1px solid #eee", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: 10, borderBottom: "1px solid #f5f5f5", fontSize: 14, whiteSpace: "nowrap" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };
