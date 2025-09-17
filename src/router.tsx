import { createBrowserRouter } from "react-router-dom";

// públicas
import Login from "./pages/Login";

// ENTIDADES
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";

// AP (Contas a Pagar)
import ContasLista from "./pages/financeiro/ContasLista";
import ContaDetalhe from "./pages/financeiro/ContaDetalhe";
import ContaNova from "./pages/financeiro/ContaNova";
import ContaAnexos from "./pages/financeiro/ContaAnexos";

// RECORRENTES
import RecorrentesList from "./pages/recorrentes/RecorrentesList";
import RecorrenteEditar from "./pages/recorrentes/RecorrenteEditar";
import RecorrentesLog from "./pages/recorrentes/RecorrentesLog";

// NFE
import ImportarNFe from "./pages/nfe/ImportarNFe";
import ConciliarNFe from "./pages/nfe/ConciliarNFe";

// DASHBOARD
import ResumoMetas from "./pages/dashboards/ResumoMetas";

// METAS
import MetasList from "./pages/metas/MetasList";
import MetaEditar from "./pages/metas/MetaEditar";

// VENDAS
import VendasList from "./pages/vendas/VendasList";
import VendaEditar from "./pages/vendas/VendaEditar";

// guard
import Protected from "./routes/Protected";

export const router = createBrowserRouter([
  // pública
  { path: "/login", element: <Login /> },

  // home -> ENTIDADES (mantenha assim ou aponte para outra seção que preferir)
  { path: "/", element: <Protected><ListarEntidades /></Protected> },

  // ENTIDADES
  { path: "/entidades", element: <Protected><ListarEntidades /></Protected> },
  { path: "/entidades/nova", element: <Protected><EditarEntidade mode="create" /></Protected> },
  { path: "/entidades/:id", element: <Protected><EditarEntidade mode="edit" /></Protected> },

  // CONTAS A PAGAR
  { path: "/financeiro/contas", element: <Protected><ContasLista /></Protected> },
  { path: "/financeiro/contas/nova", element: <Protected><ContaNova /></Protected> },
  { path: "/financeiro/contas/:id", element: <Protected><ContaDetalhe /></Protected> },
  { path: "/financeiro/contas/:id/anexos", element: <Protected><ContaAnexos /></Protected> },

  // RECORRENTES
  { path: "/recorrentes", element: <Protected><RecorrentesList /></Protected> },
  { path: "/recorrentes/nova", element: <Protected><RecorrenteEditar /></Protected> },
  { path: "/recorrentes/:id", element: <Protected><RecorrenteEditar /></Protected> },
  { path: "/recorrentes/log", element: <Protected><RecorrentesLog /></Protected> },

  // NFe
  { path: "/nfe/importar", element: <Protected><ImportarNFe /></Protected> },
  { path: "/nfe/conciliar", element: <Protected><ConciliarNFe /></Protected> },

  // DASHBOARDS
  { path: "/dashboards", element: <Protected><ResumoMetas /></Protected> },

  // METAS
  { path: "/metas", element: <Protected><MetasList /></Protected> },
  { path: "/metas/nova", element: <Protected><MetaEditar /></Protected> },
  { path: "/metas/:id", element: <Protected><MetaEditar /></Protected> },

  // VENDAS
  { path: "/vendas", element: <Protected><VendasList /></Protected> },
  { path: "/vendas/nova", element: <Protected><VendaEditar /></Protected> },
  { path: "/vendas/:id", element: <Protected><VendaEditar /></Protected> },
]);
