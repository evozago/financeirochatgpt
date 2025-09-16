import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type FormState = {
  filial_id: string;
  credor_id: string;
  descricao: string;
  valor: string;
  dia_vencimento: string; // 1-28
  ativo: boolean;
};

export default function RecorrenteEditar() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>({
    filial_id: "",
    credor_id: "",
    descricao: "",
    valor: "",
    dia_vencimento: "1",
    ativo: true,
  });

  function onChange<K extends keyof FormState>(key: K, val: FormState[K]) {
    setF((s) => ({ ...s, [key]: val }));
  }

  useEffect(() => {
    async function load() {
      if (!isEdit) return;
      const { data, error } = await supabase.from("recorrentes").select("*").eq("id", id).single();
      if (error) return alert("Erro ao carregar: " + error.message);
      setF({
        filial_id: String(data.filial_id ?? ""),
        credor_id: String(data.credor_id ?? ""),
        descricao: data.descricao ?? "",
        valor: String(data.valor ?? ""),
        dia_vencimento: String(data.dia_vencimento ?? "1"),
        ativo: !!data.ativo,
      });
    }
    load();
  }, [id, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      filial_id: f.filial_id ? Number(f.filial_id) : null,
      credor_id: f.credor_id ? Number(f.credor_id) : null,
      descricao: f.descricao.trim(),
      valor: Number(String(f.valor).replace(",", ".")),
      dia_vencimento: Number(f.dia_vencimento),
      ativo: f.ativo,
    };

    if (!payload.descricao) return alert("Informe a descrição.");
    if (!payload.valor || payload.valor <= 0) return alert("Informe o valor (> 0).");
    if (!payload.dia_vencimento || payload.dia_vencimento < 1 || payload.dia_vencimento > 28)
      return alert("Dia do vencimento deve estar entre 1 e 28.");

    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from("recorrentes").update(payload).eq("id", id);
        if (error) throw error;
        alert("Recorrente atualizado!");
      } else {
        const { error } = await supabase.from("recorrentes").insert(payload);
        if (error) throw error;
        alert("Recorrente criado!");
      }
      nav("/recorrentes", { replace: true });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/recorrentes">← Voltar</Link>
      </div>
      <h1>{isEdit ? `Editar Recorrente #${id}` : "Novo Recorrente"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <Field label="Filial ID">
          <input style={inp} value={f.filial_id} onChange={(e) => onChange("filial_id", e.target.value)} placeholder="ex.: 1" />
        </Field>

        <Field label="Credor (Entidade ID)">
          <input style={inp} value={f.credor_id} onChange={(e) => onChange("credor_id", e.target.value)} placeholder="ex.: 10" />
        </Field>

        <Field label="Descrição">
          <input style={inp} value={f.descricao} onChange={(e) => onChange("descricao", e.target.value)} placeholder="ex.: Internet (mensal)" />
        </Field>

        <Field label="Valor">
          <input style={inp} value={f.valor} onChange={(e) => onChange("valor", e.target.value)} placeholder="ex.: 150.00" />
        </Field>

        <Field label="Dia do vencimento (1 a 28)">
          <input style={{ ...inp, width: 160 }} value={f.dia_vencimento} onChange={(e) => onChange("dia_vencimento", e.target.value)} />
        </Field>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={f.ativo} onChange={(e) => onChange("ativo", e.target.checked)} />
          <span>Ativo</span>
        </label>

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
