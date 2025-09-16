import { useForm } from "react-hook-form";
import EntityDocumentField from "../../components/EntityDocumentField";
import { onlyDigits } from "../../utils/br-doc";
import { supabase } from "../../supabaseClient";

type EntidadeForm = {
  nome: string;
  tipo_pessoa: "FISICA" | "JURIDICA";
  documento?: string; // opcional
};

export default function NovaEntidade() {
  const { control, register, handleSubmit, reset } = useForm<EntidadeForm>({
    defaultValues: { nome: "", tipo_pessoa: "FISICA", documento: "" },
  });

  const onSubmit = async (data: EntidadeForm) => {
    // normaliza (só dígitos); se vier vazio, fica null
    const docDigits = onlyDigits(data.documento || "");
    const payload = {
      nome: data.nome.trim(),
      tipo_pessoa: data.tipo_pessoa,
      documento: docDigits ? docDigits : null, // opcional
      ativo: true,
    };

    // INSERT no Supabase
    const { error } = await supabase.from("entidades").insert(payload);
    if (error) {
      alert(`Erro ao salvar: ${error.message}`);
      return;
    }
    alert("Entidade salva com sucesso!");
    reset();
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-semibold mb-4">Nova Entidade</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Nome"
          {...register("nome", { required: true })}
        />
        <select
          className="border rounded px-3 py-2 w-full"
          {...register("tipo_pessoa")}
        >
          <option value="FISICA">Pessoa Física</option>
          <option value="JURIDICA">Pessoa Jurídica</option>
        </select>

        {/* Documento opcional (não obrigatório) */}
        <EntityDocumentField control={control} name="documento" required={false} />

        <button className="bg-black text-white px-4 py-2 rounded">Salvar</button>
      </form>
    </div>
  );
}
