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

// guard
import Protected from "./routes/Protected";

export const router = createBrowserRouter([
  // pública
  { path: "/login", element: <Login /> },

  // redirecionamos a home para ENTIDADES (ou troque para AP se preferir)
  {
    path: "/",
    element: (
      <Protected>
        <ListarEntidades />
      </Protected>
    ),
  },

  // ENTIDADES
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
]);
