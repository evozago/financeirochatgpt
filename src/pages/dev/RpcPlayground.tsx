// src/pages/dev/RpcPlayground.tsx
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function RpcPlayground() {
  const [entidadeId, setEntidadeId] = useState<number>(10);
  const [papel, setPapel] = useState<string>("FORNECEDOR_REVENDA");
  const [marca, setMarca] = useState<string>("Vestuário Feminino");
  const [log, setLog] = useState<string>("");

  async function onEnsurePapel() {
    setLog("Chamando ensure_papel…");
    const { error } = await supabase.rpc("ensure_papel", {
      p_entidade_id: entidadeId,
      p_papel: papel,
    });
    if (error) setLog(`Erro ensure_papel: ${error.message}`);
    else setLog(`Papel '${papel}' definido para entidade #${entidadeId}`);
  }

  async function onAttachMarca() {
    setLog("Chamando attach_marca…");
    const { error } = await supabase.rpc("attach_marca", {
      p_entidade_id: entidadeId,
      p_marca: marca,
    });
    if (error) setLog(`Erro attach_marca: ${error.message}`);
    else setLog(`Marca '${marca}' anexada à entidade #${entidadeId}`);
  }

  return (
    <div className="p-6 space-y-4 max-w-xl">
      <h1 className="text-2xl font-bold">RPC Playground (Supabase)</h1>

      <div className="space-y-2">
        <label className="text-sm">Entidade ID</label>
        <input
          type="number"
          value={entidadeId}
          onChange={(e) => setEntidadeId(Number(e.target.value))}
          className="w-full rounded border p-2"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm">Papel</label>
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value)}
          className="w-full rounded border p-2"
        >
          <option value="FORNECEDOR_REVENDA">FORNECEDOR_REVENDA</option>
          <option value="FORNECEDOR_CONSUMO">FORNECEDOR_CONSUMO</option>
          <option value="CLIENTE">CLIENTE</option>
          <option value="PROPRIETARIO">PROPRIETARIO</option>
        </select>
        <button onClick={onEnsurePapel} className="rounded bg-black px-3 py-2 text-white">
          Definir papel
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-sm">Marca</label>
        <input
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
          className="w-full rounded border p-2"
        />
        <button onClick={onAttachMarca} className="rounded bg-black px-3 py-2 text-white">
          Anexar marca
        </button>
      </div>

      <pre className="rounded bg-gray-50 p-3 text-sm">{log}</pre>
    </div>
  );
}
