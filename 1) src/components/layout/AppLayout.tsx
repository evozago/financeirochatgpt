import { Outlet, NavLink, useLocation } from "react-router-dom";
import { PropsWithChildren, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  ReceiptText,
  Repeat,
  FileUp,
  ListChecks,
  Target,
  BarChart3,
  ShoppingCart,
  Settings,
  BookUser,
  FileText,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
};

const NAV: NavItem[] = [
  // Cadastros
  { group: "CADASTROS", label: "Entidades", href: "/entidades", icon: Users },
  { group: "CADASTROS", label: "Pessoas", href: "/cadastros/pessoas", icon: BookUser },

  // Financeiro – AP
  { group: "FINANCEIRO • AP", label: "Contas", href: "/financeiro/contas", icon: ReceiptText },
  { group: "FINANCEIRO • AP", label: "Nova Conta", href: "/financeiro/contas/nova", icon: FileText },

  // Recorrentes
  { group: "FINANCEIRO • RECORRENTES", label: "Lista", href: "/recorrentes", icon: Repeat },
  { group: "FINANCEIRO • RECORRENTES", label: "Novo recorrente", href: "/recorrentes/nova", icon: Repeat },
  { group: "FINANCEIRO • RECORRENTES", label: "Log de geração", href: "/recorrentes/log", icon: ListChecks },

  // NFe
  { group: "NFE", label: "Importar XML", href: "/nfe/importar", icon: FileUp },
  { group: "NFE", label: "Conciliar", href: "/nfe/conciliar", icon: ListChecks },

  // Vendas/Metas
  { group: "VENDAS/METAS (EM BREVE)", label: "Metas", href: "/metas", icon: Target },
  { group: "VENDAS/METAS (EM BREVE)", label: "Lançamentos", href: "/vendas", icon: BarChart3 },

  // Dashboards
  { group: "DASHBOARDS (EM BREVE)", label: "Painel", href: "/dashboards", icon: LayoutDashboard },

  // Compras (esqueleto)
  { group: "COMPRAS", label: "Pedidos", href: "/compras/pedidos", icon: ShoppingCart },
  { group: "COMPRAS", label: "Fornecedores", href: "/compras/fornecedores", icon: Building2 },

  // Corporativo / Sistema
  { group: "SISTEMA CORPORATIVO", label: "Entidades Corporativas", href: "/corporativo/entidades", icon: Building2 },
  { group: "SISTEMA", label: "Relatórios", href: "/sistema/relatorios", icon: FileText },
  { group: "SISTEMA", label: "Configurações", href: "/sistema/configuracoes", icon: Settings },
];

function Header() {
  const location = useLocation();

  const title = useMemo(() => {
    const current = NAV.find((n) => location.pathname === n.href);
    if (current) return current.label;
    if (location.pathname === "/") return "Entidades";
    return "FinanceiroLB";
  }, [location.pathname]);

  return (
    <header className="h-14 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="text-[15px] font-semibold tracking-tight">{title}</div>
        <div className="text-xs text-gray-500">
          {/* aqui você pode exibir o usuário logado, hora, etc */}
          {new Date().toLocaleString()}
        </div>
      </div>
    </header>
  );
}

function Sidebar() {
  // agrupa por 'group'
  const groups = NAV.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.group ?? "Geral";
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <aside className="w-64 shrink-0 border-r bg-white h-screen sticky top-0 overflow-y-auto">
      <div className="px-4 py-4 border-b">
        <div className="text-lg font-bold">FinanceiroLB</div>
        <div className="text-xs text-gray-500">Sistema</div>
      </div>

      <nav className="px-2 py-4 space-y-4">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <div className="px-2 mb-2 text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
              {group}
            </div>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-700 hover:bg-zinc-100",
                      ].join(" ")
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen w-full bg-zinc-50 text-zinc-900">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Header />
          <div className="p-4">
            {/* conteúdo das páginas */}
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
