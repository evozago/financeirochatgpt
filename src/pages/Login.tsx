import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { signIn } from "../services/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const loc = useLocation() as any;
  const redirectTo = loc.state?.from || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), pass);
    setLoading(false);
    if (error) return alert("Falha no login: " + error.message);
    nav(redirectTo, { replace: true });
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <form onSubmit={onSubmit} style={{ width: 360, display: "grid", gap: 12 }}>
        <h1>Entrar</h1>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
          required
        />
        <input
          placeholder="Senha"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}
          required
        />
        <button disabled={loading} style={{ background: "black", color: "white", borderRadius: 8, padding: 10 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <small style={{ color: "#6b7280" }}>
          Use um usuário existente do Supabase Auth (Settings → Authentication → Users)
        </small>
      </form>
    </div>
  );
}
