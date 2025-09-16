import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import ListarEntidades from "./pages/entidades/ListarEntidades";
import NovaEntidade from "./pages/entidades/NovaEntidade";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  { path: "/entidades", element: <ListarEntidades /> },
  { path: "/entidades/nova", element: <NovaEntidade /> },
]);
