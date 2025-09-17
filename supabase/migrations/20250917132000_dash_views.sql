-- Dashboards views (placeholder)
BEGIN;

-- Exemplo de view simples para totals por mês (ajuste depois)
CREATE OR REPLACE VIEW public.vw_ap_totais_mensais AS
SELECT
  extract(year from c.dt_vencimento)::int  AS ano,
  extract(month from c.dt_vencimento)::int AS mes,
  SUM(c.valor_total) AS total
FROM public.contas_pagar_corporativas c
GROUP BY 1,2;

COMMIT;
