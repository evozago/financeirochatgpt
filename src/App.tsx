import { useForm } from "react-hook-form";
import EntityDocumentField from "./components/EntityDocumentField";
import { onlyDigits } from "./utils/br-doc";
import { supabase } from "./supabaseClient";

type EntidadeForm = {
  nome: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  documento?: string; // opcional
};

export default function App() {
  const { control, register, handleSubmit, reset } = useForm<EntidadeForm>({
    defaultValues: { nome: "", tipo_pessoa: "FISICA", documento: "" },
  });

  const onSubmit = async (data: EntidadeForm) => {
    const docDigits = onlyDigits(data.documento || "");
    const payload = {
      nome: data.nome.trim(),
      tipo_pessoa: data.tipo_pessoa,
      documento: docDigits ? docDigits : null, // opcional
      ativo: true,
    };

    const { error } = await supabase.from("entidades").insert(payload);
    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
      return;
    }
    alert("Entidade salva com sucesso!");
    reset();
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", maxWidth: 560 }}>
      <h1>Nova Entidade</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12 }}>
        <input
          placeholder="Nome"
          {...register("nome", { required: true })}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10 }}
        />
        <select
          {...register("tipo_pessoa")}
          style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10 }}
        >
          <option value="FISICA">Pessoa Física</option>
          <option value="JURIDICA">Pessoa Jurídica</option>
        </select>

        {/* Documento opcional (não obrigatório) */}
        <EntityDocumentField control={control} name="documento" required={false} />

        <button style={{ background: "black", color: "white", borderRadius: 8, padding: 10 }}>
          Salvar
        </button>
      </form>
    </div>
  );
}