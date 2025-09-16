import { RouterProvider } from "react-router-dom";
import { router } from "./router";

/* apenas injeta o RouterProvider; as páginas cuidam da própria lógica */
export default function App() {
  return <RouterProvider router={router} />;
}

