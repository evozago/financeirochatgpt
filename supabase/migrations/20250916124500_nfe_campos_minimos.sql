-- NFe — colunas mínimas (sem alterar view aqui)
-- v1.1 - 2025-09-16

BEGIN;

ALTER TABLE public.nfe_data
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao DATE,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(14,2);

CREATE INDEX IF NOT EXISTS idx_nfe_data_numero        ON public.nfe_data(numero);
CREATE INDEX IF NOT EXISTS idx_nfe_data_serie         ON public.nfe_data(serie);
CREATE INDEX IF NOT EXISTS idx_nfe_data_data_emissao  ON public.nfe_data(data_emissao);

COMMIT;
