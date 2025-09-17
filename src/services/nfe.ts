// placeholder de serviços da NFe — expandiremos com upload XML e conciliação
import { supabase } from "../supabaseClient";

export async function listPendentes() {
  const { data, error } = await supabase.from("vw_nfe_pendentes").select("*").order("data_emissao", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listConciliadas() {
  const { data, error } = await supabase.from("vw_nfe_conciliada").select("*").order("data_emissao", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// exemplo de chamada da função (ligaremos na UI quando entrar conciliação):
export async function conciliarNFe(chave: string, contaId?: number, criarConta = false) {
  const { data, error } = await supabase.rpc("fn_conciliar_nfe", {
    p_chave: chave,
    p_conta_id: contaId ?? null,
    p_criar_conta: criarConta
  });
  if (error) throw error;
  return data;
}
