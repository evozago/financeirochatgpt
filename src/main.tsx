<<<<<<< HEAD
cat > src/main.tsx <<'TSX'
=======
<<<<<<< HEAD
>>>>>>> c645543 (chore: ignore .env (não versionar chaves))
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// import "./index.css"; // opcional

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
<<<<<<< HEAD
TSX
=======
=======
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
>>>>>>> bf8c7a6 (chore: ignore .env (não versionar chaves))
>>>>>>> c645543 (chore: ignore .env (não versionar chaves))
