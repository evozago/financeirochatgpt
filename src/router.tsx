import { createBrowserRouter } from "react-router-dom";

// públicas
import Login from "./pages/Login";

// layout e guard
import Protected from "./routes/Protected";
import AppLayout from "./components/layout/AppLayout";

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

// METAS/VENDAS
import MetasList from "./pages/metas/MetasList";
import MetaEditar from "./pages/metas/MetaEditar";
import VendasList from "./pages/vendas/VendasList";
import VendaEditar from "./pages/vendas/VendaEditar";

// NOVOS (esqueleto)
import PedidosList from "./pages/compras/PedidosList";
import PedidoEditar from "./pages/compras/PedidoEditar";
import FornecedoresList from "./pages/compras/FornecedoresList";

import PessoasList from "./pages/cadastros/PessoasList";
import EntidadesCorporativas from "./pages/corporativo/EntidadesCorporativas";

import Relatorios from "./pages/sistema/Relatorios";
import Configuracoes from "./pages/sistema/Configuracoes";

export const router = createBrowserRouter([
  // rota pública
  { path: "/login", element: <Login /> },

  // ROTAS PROTEGIDAS (layout + children)
  {
    element: (
      <Protected>
        <AppLayout />
      </Protected>
    ),
    children: [
      // home
      { path: "/", element: <ListarEntidades /> },

      // ENTIDADES
      { path: "/entidades", element: <ListarEntidades /> },
      { path: "/entidades/nova", element: <EditarEntidade mode="create" /> },
      { path: "/entidades/:id", element: <EditarEntidade mode="edit" /> },

      // CONTAS A PAGAR
      { path: "/financeiro/contas", element: <ContasLista /> },
      { path: "/financeiro/contas/nova", element: <ContaNova /> },
      { path: "/financeiro/contas/:id", element: <ContaDetalhe /> },
      { path: "/financeiro/contas/:id/anexos", element: <ContaAnexos /> },

      // RECORRENTES
      { path: "/recorrentes", element: <RecorrentesList /> },
      { path: "/recorrentes/nova", element: <RecorrenteEditar /> },
      { path: "/recorrentes/:id", element: <RecorrenteEditar /> },
      { path: "/recorrentes/log", element: <RecorrentesLog /> },

      // NFE
      { path: "/nfe/importar", element: <ImportarNFe /> },
      { path: "/nfe/conciliar", element: <ConciliarNFe /> },

      // DASHBOARDS
      { path: "/dashboards", element: <ResumoMetas /> },

      // METAS
      { path: "/metas", element: <MetasList /> },
      { path: "/metas/nova", element: <MetaEditar /> },
      { path: "/metas/:id", element: <MetaEditar /> },

      // VENDAS
      { path: "/vendas", element: <VendasList /> },
      { path: "/vendas/nova", element: <VendaEditar /> },
      { path: "/vendas/:id", element: <VendaEditar /> },

      // COMPRAS (esqueleto)
      { path: "/compras/pedidos", element: <PedidosList /> },
      { path: "/compras/pedidos/nova", element: <PedidoEditar /> },
      { path: "/compras/pedidos/:id", element: <PedidoEditar /> },
      { path: "/compras/fornecedores", element: <FornecedoresList /> },

      // CADASTROS
      { path: "/cadastros/pessoas", element: <PessoasList /> },

      // SISTEMA CORPORATIVO
      { path: "/corporativo/entidades", element: <EntidadesCorporativas /> },

      // SISTEMA
      { path: "/sistema/relatorios", element: <Relatorios /> },
      { path: "/sistema/configuracoes", element: <Configuracoes /> },
    ],
  },
]);
