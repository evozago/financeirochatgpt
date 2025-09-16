import { supabase } from "../supabaseClient";

/* leitura genérica */
export async function fromTable<T>(table: string, columns = "*", modifiers?: (q: any) => any) {
  let q = supabase.from(table).select(columns);
  if (modifiers) q = modifiers(q);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

/* leitura single por id */
export async function findById<T>(table: string, id: number | string, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns).eq("id", id).single();
  if (error) throw error;
  return data as T;
}

/* inserts/updates/deletes */
export async function insertInto<T extends Record<string, any>>(table: string, payload: T) {
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw error;
}
export async function updateById<T extends Record<string, any>>(table: string, id: number | string, payload: T) {
  const { error } = await supabase.from(table).update(payload).eq("id", id);
  if (error) throw error;
}
export async function deleteById(table: string, id: number | string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}
