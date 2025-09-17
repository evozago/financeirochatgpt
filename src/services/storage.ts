import { supabase } from "../supabaseClient";

/** Bucket usado para anexos de AP */
const BUCKET = "ap-anexos";

/** Lista objetos do prefixo (pasta) */
export async function listFiles(prefix: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: "updated_at", order: "desc" },
  });
  if (error) throw error;
  return data ?? [];
}

/** Upload de arquivo no path informado */
export async function uploadFile(path: string, file: File | Blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw error;
}

/** Remove arquivo pelo path completo */
export async function removeFile(path: string) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** URL assinada (download) */
export async function getSignedUrl(path: string, secs = 60) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, secs);
  if (error) throw error;
  return data?.signedUrl ?? null;
}
