import { createBrowserRouter } from "react-router-dom";

// páginas já existentes
import Login from "./pages/Login";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";
import Protected from "./routes/Protected";

// AP (lista, detalhe, nova)
import ContasLista from "./pages/financeiro/ContasLista";
import ContaDetalhe from "./pages/financeiro/ContaDetalhe";
import ContaNova from "./pages/financeiro/ContaNova";

// (opcionais, quando quiser ativar)
// import RecorrentesList from "./pages/recorrentes/RecorrentesList";
// import ImportarNFe from "./pages/nfe/ImportarNFe";
// import ConciliarNFe from "./pages/nfe/ConciliarNFe";

export const router = createBrowserRouter([
  // pública
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

  // CONTAS A PAGAR
  {
    path: "/financeiro/contas",
    element: (
      <Protected>
        <ContasLista />
      </Protected>
    ),
  },
  {
    path: "/financeiro/contas/nova",
    element: (
      <Protected>
        <ContaNova />
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

  // Ative quando quiser:
  // { path: "/recorrentes", element: <Protected><RecorrentesList /></Protected> },
  // { path: "/nfe/importar", element: <Protected><ImportarNFe /></Protected> },
  // { path: "/nfe/conciliar", element: <Protected><ConciliarNFe /></Protected> },
]);
