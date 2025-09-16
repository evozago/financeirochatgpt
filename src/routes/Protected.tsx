import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/* component que verifica se há usuário logado; se não, redireciona */
export default function Protected({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    const session = supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  }, [navigate]);

  return <>{children}</>;
}
