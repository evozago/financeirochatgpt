import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

type FormState = {
  filial_id: string;
  descricao: string;
  valor_total: string;
  dt_vencimento: string;      // yyyy-mm-dd
  status: "aberta" | "parcial" | "paga" | "cancelada";
  observacoes: string;
  gerarParcelas: boolean;
  qtdParcelas: string;        // número em texto, convertemos p/ int
};

export default function ContaNova() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<FormState>({
    filial_id: "",
    descricao: "",
    valor_total: "",
    dt_vencimento: "",
    status: "aberta",
    observacoes: "",
    gerarParcelas: false,
    qtdParcelas: "3",
  });

  function onChange<K extends keyof FormState>(key: K, val: FormState[K]) {
    setF((s) => ({ ...s, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // validações simples
    const filialId = Number(f.filial_id);
    const total = Number(f.valor_total.replace(",", "."));
    const venc = f.dt_vencimento;

    if (!filialId || filialId <= 0) return alert("Informe uma filial válida (número).");
    if (!f.descricao.trim()) return alert("Informe a descrição.");
    if (!total || total < 0) return alert("Informe o valor total (maior que zero).");
    if (!venc) return alert("Informe o vencimento (yyyy-mm-dd).");

    setSaving(true);
    try {
      // 1) cria a conta
      const { data: created, error } = await supabase
        .from("contas_pagar_corporativas")
        .insert({
          filial_id: filialId,
          credor_id: null,
          descricao: f.descricao.trim(),
          valor_total: total,
          dt_vencimento: venc,
          status: f.status,
          observacoes: f.observacoes.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;
      const contaId = created.id as number;

      // 2) gera parcelas (opcional)
      if (f.gerarParcelas) {
        const n = parseInt(f.qtdParcelas || "0", 10);
        if (!n || n <= 0) throw new Error("Quantidade de parcelas inválida.");

        // divide valor; ajusta diferença na última
        const base = Math.floor((total / n) * 100) / 100;
        const inserts: any[] = [];
        let soma = 0;

        for (let i = 1; i <= n; i++) {
          let valor = base;
          if (i === n) valor = Math.round((total * 100 - soma) ) / 100; // último recebe ajuste
          soma += Math.round(valor * 100);

          const d = new Date(venc);
          d.setMonth(d.getMonth() + (i - 1));
          const vencParcela = d.toISOString().slice(0, 10);

          inserts.push({
            conta_pagar_id: contaId,
            num_parcela: i,
            data_vencimento: vencParcela,
            valor_parcela: valor,
            status: "a_vencer",
          });
        }

        const { error: perr } = await supabase
          .from("parcelas_conta_pagar")
          .insert(inserts);

        if (perr) throw perr;
      }

      alert("Conta criada com sucesso!");
      nav(`/financeiro/contas/${contaId}`, { replace: true });
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "system-ui,-apple-system, Segoe UI, Roboto", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/financeiro/contas">← Voltar</Link>
      </div>
      <h1>Nova Conta</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={row}>
          <label style={lbl}>Filial ID</label>
          <input
            style={inp}
            placeholder="ex.: 1"
            value={f.filial_id}
            onChange={(e) => onChange("filial_id", e.target.value)}
          />
        </div>

        <div style={row}>
          <label style={lbl}>Descrição</label>
          <input
            style={inp}
            placeholder="ex.: Energia (Set/2025)"
            value={f.descricao}
            onChange={(e) => onChange("descricao", e.target.value)}
          />
        </div>

        <div style={row}>
          <label style={lbl}>Valor Total</label>
          <input
            style={inp}
            placeholder="ex.: 1200.00"
            value={f.valor_total}
            onChange={(e) => onChange("valor_total", e.target.value)}
          />
        </div>

        <div style={row}>
          <label style={lbl}>Vencimento</label>
          <input
            type="date"
            style={inp}
            value={f.dt_vencimento}
            onChange={(e) => onChange("dt_vencimento", e.target.value)}
          />
        </div>

        <div style={row}>
          <label style={lbl}>Status</label>
          <select
            style={inp}
            value={f.status}
            onChange={(e) => onChange("status", e.target.value as FormState["status"])}
          >
            <option value="aberta">aberta</option>
            <option value="parcial">parcial</option>
            <option value="paga">paga</option>
            <option value="cancelada">cancelada</option>
          </select>
        </div>

        <div style={row}>
          <label style={lbl}>Observações</label>
          <textarea
            style={{ ...inp, height: 90, resize: "vertical" }}
            placeholder="Texto livre..."
            value={f.observacoes}
            onChange={(e) => onChange("observacoes", e.target.value)}
          />
        </div>

        <fieldset style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
          <legend>Parcelas automáticas (opcional)</legend>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={f.gerarParcelas}
              onChange={(e) => onChange("gerarParcelas", e.target.checked)}
            />
            <span>Gerar parcelas automaticamente</span>
          </label>
          {f.gerarParcelas && (
            <div style={{ marginTop: 12 }}>
              <label style={lbl}>Quantidade de parcelas</label>
              <input
                style={{ ...inp, width: 160 }}
                placeholder="ex.: 3"
                value={f.qtdParcelas}
                onChange={(e) => onChange("qtdParcelas", e.target.value)}
              />
              <p style={{ color: "#666", marginTop: 8, fontSize: 13 }}>
                O sistema divide o valor total igualmente. A última parcela recebe um ajuste de centavos se necessário.
              </p>
            </div>
          )}
        </fieldset>

        <div style={{ marginTop: 8 }}>
          <button
            disabled={saving}
            style={{
              background: "#111",
              color: "white",
              borderRadius: 8,
              padding: "10px 14px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}

const row: React.CSSProperties = { display: "grid", gap: 6 };
const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 600 };
const inp: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 8, padding: 10, fontSize: 14 };
