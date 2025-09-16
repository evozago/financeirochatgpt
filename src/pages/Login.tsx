import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      alert(`Erro ao entrar: ${error.message}`);
    } else {
      navigate("/entidades");
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <h1>Entrar</h1>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      <button>Entrar</button>
      <p>Use um usuário existente do Supabase (Settings → Authentication → Users)</p>
    </form>
  );
}
