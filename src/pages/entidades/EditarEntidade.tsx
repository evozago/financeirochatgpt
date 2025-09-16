import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { onlyDigits } from "../../utils/br-doc";
import EntityDocumentField from "../../components/EntityDocumentField";
import { supabase } from "../../supabaseClient";

type EntidadeForm = {
  nome: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  documento?: string;
  ativo?: boolean;
};

export default function EditarEntidade({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const nav = useNavigate();
  const { control, register, handleSubmit, reset } = useForm<EntidadeForm>({
    defaultValues: { nome: "", tipo_pessoa: "FISICA", documento: "", ativo: true }
  });

  // carregar se for edição
  useEffect(() => {
    if (mode === "edit" && id) {
      supabase.from("entidades").select("*").eq("id", id).single().then(({ data, error }) => {
        if (error) { alert("Erro ao carregar: " + error.message); return; }
        reset({
          nome: data?.nome,
          tipo_pessoa: data?.tipo_pessoa,
          documento: data?.documento || "",
          ativo: data?.ativo
        });
      });
    }
  }, [mode, id, reset]);

  const onSubmit = async (f: EntidadeForm) => {
    const docDigits = onlyDigits(f.documento || "");
    const payload = {
      nome: f.nome.trim(),
      tipo_pessoa: f.tipo_pessoa,
      documento: docDigits ? docDigits : null,
      ativo: !!f.ativo
    };

    if (mode === "create") {
      const { error } = await supabase.from("entidades").insert(payload);
      if (error) { alert("Erro ao salvar: " + error.message); return; }
      alert("Criado com sucesso");
    } else {
      const { error } = await supabase.from("entidades").update(payload).eq("id", id!);
      if (error) { alert("Erro ao salvar: " + error.message); return; }
      alert("Atualizado com sucesso");
    }
    nav("/entidades");
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 560 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/entidades" style={{ textDecoration: "none" }}>← Voltar</Link>
      </div>
      <h1>{mode === "create" ? "Nova Entidade" : `Editar Entidade #${id}`}</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Nome"
          {...register("nome", { required: true })}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
        />
        <select
          {...register("tipo_pessoa")}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
        >
          <option value="FISICA">Pessoa Física</option>
          <option value="JURIDICA">Pessoa Jurídica</option>
        </select>

        <EntityDocumentField control={control} name="documento" required={false} />

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" {...register("ativo")} />
          <span>Ativo</span>
        </label>

        <button style={{ background: "black", color: "white", borderRadius: 8, padding: 10 }}>
          Salvar
        </button>
      </form>
    </div>
  );
}
