import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getSession, onAuthChange } from "../services/auth";

export default function Protected({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const loc = useLocation();

  useEffect(() => {
    let active = true;

    async function boot() {
      const s = await getSession();
      if (!active) return;
      setIsAuthed(!!s);
      setLoading(false);
    }

    const { data: sub } = onAuthChange(() => {
      getSession().then((s) => setIsAuthed(!!s));
    });

    boot();
    return () => {
      active = false;
      sub.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Carregando…</div>;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;

  return <>{children}</>;
}
