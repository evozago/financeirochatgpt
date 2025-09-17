import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type FormState = {
  entidade_id: string;
  ano: string;
  mes: string;
  valor_vendido: string;
};

export default function VendaEditar() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [entidadeNome, setEntidadeNome] = useState<string>("");

  const now = new Date();
  const [f, setF] = useState<FormState>({
    entidade_id: "",
    ano: String(now.getFullYear()),
    mes: String(now.getMonth() + 1),
    valor_vendido: "",
  });

  function onChange<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    async function load() {
      if (!isEdit) return;
      const { data, error } = await supabase.from("vendas_mensais").select("*").eq("id", id).single();
      if (error) return alert("Erro ao carregar: " + error.message);
      setF({
        entidade_id: String(data.entidade_id ?? ""),
        ano: String(data.ano ?? ""),
        mes: String(data.mes ?? ""),
        valor_vendido: String(data.valor_vendido ?? ""),
      });
    }
    load();
  }, [id, isEdit]);

  useEffect(() => {
    async function loadNome() {
      const n = Number(f.entidade_id);
      if (!n || Number.isNaN(n)) { setEntidadeNome(""); return; }
      const { data } = await supabase.from("entidades").select("nome").eq("id", n).limit(1);
      setEntidadeNome(data && data.length ? data[0].nome : "");
    }
    loadNome();
  }, [f.entidade_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      entidade_id: Number(f.entidade_id),
      ano: Number(f.ano),
      mes: Number(f.mes),
      valor_vendido: Number(String(f.valor_vendido).replace(",", ".")),
    };

    if (!payload.entidade_id) return alert("Entidade (ID) obrigatório.");
    if (!payload.ano) return alert("Ano obrigatório.");
    if (!payload.mes || payload.mes < 1 || payload.mes > 12) return alert("Mês deve ser 1..12.");
    if (!payload.valor_vendido || payload.valor_vendido <= 0) return alert("Valor vendido deve ser > 0.");

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("vendas_mensais").update(payload).eq("id", id);
        if (error) throw error;
        alert("Venda atualizada!");
      } else {
        const { error } = await supabase.from("vendas_mensais").insert(payload);
        if (error) throw error;
        alert("Venda registrada!");
      }
      nav("/vendas", { replace: true });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/vendas">← Voltar</Link>
      </div>
      <h1>{isEdit ? `Editar Venda #${id}` : "Nova Venda"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Entidade (ID)">
          <input style={inp} value={f.entidade_id} onChange={(e) => onChange("entidade_id", e.target.value)} />
          {entidadeNome && <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>• {entidadeNome}</div>}
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Ano"><input style={inp} value={f.ano} onChange={(e) => onChange("ano", e.target.value)} /></Field>
          <Field label="Mês (1-12)"><input style={inp} value={f.mes} onChange={(e) => onChange("mes", e.target.value)} /></Field>
        </div>

        <Field label="Valor Vendido">
          <input style={inp} value={f.valor_vendido} onChange={(e) => onChange("valor_vendido", e.target.value)} />
        </Field>

        <div>
          <button disabled={saving} style={{ background: "#111", color: "white", borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer" }}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 6 }}><label style={lbl}>{label}</label>{children}</div>;
}
const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
