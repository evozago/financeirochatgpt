import { useForm } from "react-hook-form";
import EntityDocumentField from "./components/EntityDocumentField";
import { onlyDigits } from "./utils/br-doc";

type EntidadeForm = {
  nome: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  documento?: string;
};

export default function App() {
  const { control, register, handleSubmit, reset } = useForm<EntidadeForm>({
    defaultValues: { nome: "", tipo_pessoa: "FISICA", documento: "" },
  });

  const onSubmit = (data: EntidadeForm) => {
    const docDigits = onlyDigits(data.documento || "");
    console.log("submit (teste sem supabase):", { ...data, documento: docDigits || null });
    alert("Form OK (sem Supabase). Abrir Console para ver payload.");
    reset();
  };

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1>Nova Entidade</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
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

        <EntityDocumentField control={control} name="documento" required={false} />

        <button style={{ background: "black", color: "white", borderRadius: 8, padding: 10 }}>
          Salvar
        </button>
      </form>
    </div>
  );
}
