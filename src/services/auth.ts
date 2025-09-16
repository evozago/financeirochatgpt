import { supabase } from "../supabaseClient";
import type { Session } from "@supabase/supabase-js";

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthChange(cb: () => void) {
  return supabase.auth.onAuthStateChange((_event, _session) => cb());
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  await supabase.auth.signOut();
}
