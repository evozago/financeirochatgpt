import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";
import ContasLista from "./pages/financeiro/ContasLista";
import ContaDetalhe from "./pages/financeiro/ContaDetalhe";
import Protected from "./routes/Protected";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  // Entidades
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

  // Contas a Pagar
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
        <ContaDetalhe /> {/* detalhe vazio → cadastro nova */}
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
