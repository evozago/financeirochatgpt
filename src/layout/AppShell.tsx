import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

/**
 * AppShell: Sidebar + Header + Conteúdo
 * - Mostra o email do usuário logado e botão "Sair"
 * - Menu lateral com TODOS os módulos (links prontos)
 * - Realça a rota ativa
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null));
    return () => sub.subscription?.unsubscribe();
  }, []);

  async function sair() {
    await supabase.auth.signOut();
    nav("/login", { replace: true });
  }

  const items = useMemo(
    () => [
      { section: "Cadastros", links: [
        { to: "/entidades", label: "Entidades" },
      ]},
      { section: "Financeiro • AP", links: [
        { to: "/financeiro/contas", label: "Contas" },
        { to: "/financeiro/contas/nova", label: "Nova Conta" },
      ]},
      { section: "Financeiro • Recorrentes", links: [
        { to: "/recorrentes", label: "Lista" },
        { to: "/recorrentes/nova", label: "Novo recorrente" },
        { to: "/recorrentes/log", label: "Log de geração" },
      ]},
      { section: "NFe", links: [
        { to: "/nfe/importar", label: "Importar XML" },
        { to: "/nfe/conciliar", label: "Conciliar" },
      ]},
      { section: "Vendas/Metas (em breve)", links: [
        { to: "/metas", label: "Metas" },
        { to: "/vendas", label: "Lançamentos" },
      ]},
      { section: "Dashboards (em breve)", links: [
        { to: "/dashboards", label: "Painel" },
      ]},
    ],
    []
  );

  return (
    <div style={wrap}>
      {/* SIDEBAR */}
      <aside style={sidebar}>
        <div style={{ fontWeight: 800, marginBottom: 16, fontSize: 18 }}>FinanceiroLB</div>
        {items.map((blk) => (
          <div key={blk.section} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>
              {blk.section}
            </div>
            <nav style={{ display: "grid", gap: 6 }}>
              {blk.links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  style={linkStyle(loc.pathname, l.to)}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
        <div style={{ marginTop: "auto", fontSize: 12, color: "#6b7280" }}>
          {email ? <div style={{ marginBottom: 8, wordBreak: "break-all" }}>{email}</div> : null}
          <button onClick={sair} style={btnOutline}>Sair</button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div style={main}>
        <header style={header}>
          <div />
          <div style={{ color: "#6b7280", fontSize: 13 }}>
            {new Date().toLocaleString("pt-BR")}
          </div>
        </header>
        <div style={{ padding: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* styles */
const wrap: React.CSSProperties = { display: "flex", minHeight: "100vh", fontFamily: "system-ui,-apple-system, Segoe UI, Roboto" };
const sidebar: React.CSSProperties = { width: 260, padding: 16, borderRight: "1px solid #eee", display: "flex", flexDirection: "column" };
const main: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column" };
const header: React.CSSProperties = { height: 52, borderBottom: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", background: "#fafafa" };
const btnOutline: React.CSSProperties = { border: "1px solid #999", background: "transparent", color: "#333", padding: "6px 10px", borderRadius: 6, cursor: "pointer", width: "100%" };

function linkStyle(path: string, to: string): React.CSSProperties {
  const active = path === to || (to !== "/" && path.startsWith(to));
  return {
    textDecoration: "none",
    fontSize: 14,
    padding: "8px 10px",
    borderRadius: 8,
    color: active ? "#111" : "#374151",
    background: active ? "#e5e7eb" : "transparent",
  };
}
