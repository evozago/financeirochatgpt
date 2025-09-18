import { createBrowserRouter } from "react-router-dom";

// --- Públicas ---
import Login from "./pages/Login";

// --- ENTIDADES ---
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";

// --- AP (Contas a Pagar) ---
import ContasLista from "./pages/financeiro/ContasLista";
import ContaDetalhe from "./pages/financeiro/ContaDetalhe";
import ContaNova from "./pages/financeiro/ContaNova";
import ContaAnexos from "./pages/financeiro/ContaAnexos";

// --- RECORRENTES ---
import RecorrentesList from "./pages/recorrentes/RecorrentesList";
import RecorrenteEditar from "./pages/recorrentes/RecorrenteEditar";
import RecorrentesLog from "./pages/recorrentes/RecorrentesLog";

// --- NFE ---
import ImportarNFe from "./pages/nfe/ImportarNFe";
import ConciliarNFe from "./pages/nfe/ConciliarNFe";

// --- DASHBOARDS ---
import ResumoMetas from "./pages/dashboards/ResumoMetas";

// --- METAS/VENDAS ---
import MetasList from "./pages/metas/MetasList";
import MetaEditar from "./pages/metas/MetaEditar";
import VendasList from "./pages/vendas/VendasList";
import VendaEditar from "./pages/vendas/VendaEditar";

// --- COMPRAS (esqueleto) ---
import PedidosList from "./pages/compras/PedidosList";
import PedidoEditar from "./pages/compras/PedidoEditar";
import FornecedoresList from "./pages/compras/FornecedoresList";

// --- CADASTROS ---
import PessoasList from "./pages/cadastros/PessoasList";

// --- SISTEMA CORPORATIVO ---
import EntidadesCorporativas from "./pages/corporativo/EntidadesCorporativas";

// --- SISTEMA ---
import Relatorios from "./pages/sistema/Relatorios";
import Configuracoes from "./pages/sistema/Configuracoes";

// --- Guard ---
import Protected from "./routes/Protected";

export const router = createBrowserRouter([
  // --- PÚBLICA ---
  { path: "/login", element: <Login /> },

  // --- HOME (pode apontar para ENTIDADES ou DASHBOARD) ---
  { path: "/", element: <Protected><ListarEntidades /></Protected> },

  // --- ENTIDADES ---
  { path: "/entidades", element: <Protected><ListarEntidades /></Protected> },
  { path: "/entidades/nova", element: <Protected><EditarEntidade mode="create" /></Protected> },
  { path: "/entidades/:id", element: <Protected><EditarEntidade mode="edit" /></Protected> },

  // --- CONTAS A PAGAR ---
  { path: "/financeiro/contas", element: <Protected><ContasLista /></Protected> },
  { path: "/financeiro/contas/nova", element: <Protected><ContaNova /></Protected> },
  { path: "/financeiro/contas/:id", element: <Protected><ContaDetalhe /></Protected> },
  { path: "/financeiro/contas/:id/anexos", element: <Protected><ContaAnexos /></Protected> },

  // --- RECORRENTES ---
  { path: "/recorrentes", element: <Protected><RecorrentesList /></Protected> },
  { path: "/recorrentes/nova", element: <Protected><RecorrenteEditar /></Protected> },
  { path: "/recorrentes/:id", element: <Protected><RecorrenteEditar /></Protected> },
  { path: "/recorrentes/log", element: <Protected><RecorrentesLog /></Protected> },

  // --- NFE ---
  { path: "/nfe/importar", element: <Protected><ImportarNFe /></Protected> },
  { path: "/nfe/conciliar", element: <Protected><ConciliarNFe /></Protected> },

  // --- DASHBOARDS ---
  { path: "/dashboards", element: <Protected><ResumoMetas /></Protected> },

  // --- METAS ---
  { path: "/metas", element: <Protected><MetasList /></Protected> },
  { path: "/metas/nova", element: <Protected><MetaEditar /></Protected> },
  { path: "/metas/:id", element: <Protected><MetaEditar /></Protected> },

  // --- VENDAS ---
  { path: "/vendas", element: <Protected><VendasList /></Protected> },
  { path: "/vendas/nova", element: <Protected><VendaEditar /></Protected> },
  { path: "/vendas/:id", element: <Protected><VendaEditar /></Protected> },

  // --- COMPRAS ---
  { path: "/compras/pedidos", element: <Protected><PedidosList /></Protected> },
  { path: "/compras/pedidos/nova", element: <Protected><PedidoEditar /></Protected> },
  { path: "/compras/pedidos/:id", element: <Protected><PedidoEditar /></Protected> },
  { path: "/compras/fornecedores", element: <Protected><FornecedoresList /></Protected> },

  // --- CADASTROS ---
  { path: "/cadastros/pessoas", element: <Protected><PessoasList /></Protected> },

  // --- SISTEMA CORPORATIVO ---
  { path: "/corporativo/entidades", element: <Protected><EntidadesCorporativas /></Protected> },

  // --- SISTEMA ---
  { path: "/sistema/relatorios", element: <Protected><Relatorios /></Protected> },
  { path: "/sistema/configuracoes", element: <Protected><Configuracoes /></Protected> },
]);
