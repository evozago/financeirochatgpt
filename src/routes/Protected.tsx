import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AppShell from "../layout/AppShell";

/**
 * Protected: exige usuário autenticado e envolve o conteúdo com o AppShell.
 * - Se não houver sessão → redireciona para /login
 * - Se houver → renderiza AppShell + children
 */
export default function Protected({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let active = true;
    async function boot() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setIsAuthed(!!data.session);
      setLoading(false);
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setIsAuthed(!!s));
    boot();
    return () => {
      active = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return <AppShell>{children}</AppShell>;
}
