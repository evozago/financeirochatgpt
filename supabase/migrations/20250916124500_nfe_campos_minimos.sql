-- NFe — colunas mínimas + ajuste da vw_nfe_conciliada
-- v1.0 - 2025-09-16 (idempotente)

BEGIN;

-- 1) Adicionar colunas mínimas (não quebra se já existir)
ALTER TABLE public.nfe_data
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao DATE,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(14,2);

-- 1.1) Índices úteis (não exclusivos)
CREATE INDEX IF NOT EXISTS idx_nfe_data_numero ON public.nfe_data(numero);
CREATE INDEX IF NOT EXISTS idx_nfe_data_serie ON public.nfe_data(serie);
CREATE INDEX IF NOT EXISTS idx_nfe_data_data_emissao ON public.nfe_data(data_emissao);

-- 2) Atualizar a view (condicional como antes), agora incluindo numero/serie e preferindo valor_total
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='parcelas_conta_pagar'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.vw_nfe_conciliada AS
      WITH soma AS (
        SELECT l.chave_acesso, sum(p.valor_parcela) AS total_parcelas, count(*) AS qtd_parcelas
        FROM public.nfe_parcela_link l
        JOIN public.parcelas_conta_pagar p ON p.id = l.parcela_id
        GROUP BY l.chave_acesso
      )
      SELECT 
        n.chave_acesso,
        n.numero,
        n.serie,
        n.data_emissao,
        n.modelo,
        n.emitente,
        n.destinatario,
        COALESCE(n.valor_total, (n.valores->>'total')::numeric) AS total_nfe,
        s.total_parcelas,
        s.qtd_parcelas,
        (COALESCE(n.valor_total, (n.valores->>'total')::numeric, 0) - COALESCE(s.total_parcelas, 0)) AS diferenca
      FROM public.nfe_data n
      LEFT JOIN soma s ON s.chave_acesso = n.chave_acesso;
    $v$;
  ELSE
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.vw_nfe_conciliada AS
      SELECT 
        n.chave_acesso,
        n.numero,
        n.serie,
        n.data_emissao,
        n.modelo,
        n.emitente,
        n.destinatario,
        COALESCE(n.valor_total, (n.valores->>'total')::numeric) AS total_nfe,
        NULL::numeric AS total_parcelas,
        NULL::integer AS qtd_parcelas,
        NULL::numeric AS diferenca
      FROM public.nfe_data n;
    $v$;
  END IF;
END
$$;

COMMIT;
