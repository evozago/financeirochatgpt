import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";
import Protected from "./routes/Protected";

/* define rotas públicas e protegidas; cada “element” deve ser um elemento React */
export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
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
]);
