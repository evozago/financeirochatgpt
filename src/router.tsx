import { createBrowserRouter } from "react-router-dom";

// páginas já existentes
import Login from "./pages/Login";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";
import Protected from "./routes/Protected";

// novas páginas (esqueletos que te passei)
import ContasLista from "./pages/financeiro/ContasLista";
import ContaDetalhe from "./pages/financeiro/ContaDetalhe";
import RecorrentesList from "./pages/recorrentes/RecorrentesList";
import ImportarNFe from "./pages/nfe/ImportarNFe";
import ConciliarNFe from "./pages/nfe/ConciliarNFe";

/* define rotas públicas e protegidas; cada “element” deve ser um elemento React */
export const router = createBrowserRouter([
  // rota pública
  { path: "/login", element: <Login /> },

  // ENTIDADES
  {
    path: "/",
    element: (
      <Protected>
        <ListarEntidades />
      </Protected>
    ),
  },
  {
    path: "/entidades",
    element: (
      <Protected>
        <ListarEntidades />
      </Protected>
    ),
  },
  {
    path: "/entidades/nova",
    element: (
      <Protected>
        <EditarEntidade mode="create" />
      </Protected>
    ),
  },
  {
    path: "/entidades/:id",
    element: (
      <Protected>
        <EditarEntidade mode="edit" />
      </Protected>
    ),
  },

  // CONTAS A PAGAR (AP)
  {
    path: "/financeiro/contas",
    element: (
      <Protected>
        <ContasLista />
      </Protected>
    ),
  },
  {
    path: "/financeiro/contas/:id",
    element: (
      <Protected>
        <ContaDetalhe />
      </Protected>
    ),
  },

  // RECORRENTES
  {
    path: "/recorrentes",
    element: (
      <Protected>
        <RecorrentesList />
      </Protected>
    ),
  },

  // NFe
  {
    path: "/nfe/importar",
    element: (
      <Protected>
        <ImportarNFe />
      </Protected>
    ),
  },
  {
    path: "/nfe/conciliar",
    element: (
      <Protected>
        <ConciliarNFe />
      </Protected>
    ),
  },
]);
