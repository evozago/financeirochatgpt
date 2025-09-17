import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type FormState = {
  entidade_id: string;
  ano: string;
  mes: string;
  valor_meta: string;
};

export default function MetaEditar() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>({
    entidade_id: "",
    ano: String(new Date().getFullYear()),
    mes: String(new Date().getMonth() + 1),
    valor_meta: "",
  });

  function onChange<K extends keyof FormState>(k: K, v: FormState[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  useEffect(() => {
    async function load() {
      if (!isEdit) return;
      const { data, error } = await supabase.from("metas_mensais").select("*").eq("id", id).single();
      if (error) return alert("Erro ao carregar: " + error.message);
      setF({
        entidade_id: String(data.entidade_id ?? ""),
        ano: String(data.ano ?? ""),
        mes: String(data.mes ?? ""),
        valor_meta: String(data.valor_meta ?? ""),
      });
    }
    load();
  }, [id, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      entidade_id: Number(f.entidade_id),
      ano: Number(f.ano),
      mes: Number(f.mes),
      valor_meta: Number(String(f.valor_meta).replace(",", ".")),
    };

    if (!payload.entidade_id) return alert("Entidade (ID) obrigatório.");
    if (!payload.ano) return alert("Ano obrigatório.");
    if (!payload.mes || payload.mes < 1 || payload.mes > 12) return alert("Mês deve ser 1..12.");
    if (!payload.valor_meta || payload.valor_meta <= 0) return alert("Valor da meta deve ser > 0.");

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("metas_mensais").update(payload).eq("id", id);
        if (error) throw error;
        alert("Meta atualizada!");
      } else {
        // impedir duplicidade (entidade+ano+mes)
        const { data: dup } = await supabase
          .from("metas_mensais")
          .select("id")
          .eq("entidade_id", payload.entidade_id)
          .eq("ano", payload.ano)
          .eq("mes", payload.mes)
          .limit(1);

        if (dup && dup.length) {
          return alert("Já existe meta para esta entidade neste mês/ano.");
        }

        const { error } = await supabase.from("metas_mensais").insert(payload);
        if (error) throw error;
        alert("Meta criada!");
      }
      nav("/metas", { replace: true });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/metas">← Voltar</Link>
      </div>
      <h1>{isEdit ? `Editar Meta #${id}` : "Nova Meta"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Entidade (ID)">
          <input style={inp} value={f.entidade_id} onChange={(e) => onChange("entidade_id", e.target.value)} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Ano">
            <input style={inp} value={f.ano} onChange={(e) => onChange("ano", e.target.value)} />
          </Field>
          <Field label="Mês (1-12)">
            <input style={inp} value={f.mes} onChange={(e) => onChange("mes", e.target.value)} />
          </Field>
        </div>

        <Field label="Valor da Meta">
          <input style={inp} value={f.valor_meta} onChange={(e) => onChange("valor_meta", e.target.value)} />
        </Field>

        <div>
          <button
            disabled={saving}
            style={{ background: "#111", color: "white", borderRadius: 8, padding: "10px 14px", border: "none", cursor: "pointer" }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={lbl}>{label}</label>
      {children}
    </div>
  );
}
const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
