import { createBrowserRouter } from "react-router-dom";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import EditarEntidade from "./pages/entidades/EditarEntidade";

export const router = createBrowserRouter([
  { path: "/", element: <ListarEntidades /> },
  { path: "/entidades", element: <ListarEntidades /> },
  { path: "/entidades/nova", element: <EditarEntidade mode="create" /> },
  { path: "/entidades/:id", element: <EditarEntidade mode="edit" /> },
]);
