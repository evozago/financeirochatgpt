import { supabase } from "./supabaseClient";
// ...
const onSubmit = async (data: EntidadeForm) => {
  const docDigits = onlyDigits(data.documento || "");
  const payload = {
    nome: data.nome.trim(),
    tipo_pessoa: data.tipo_pessoa,
    documento: docDigits || null,
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
