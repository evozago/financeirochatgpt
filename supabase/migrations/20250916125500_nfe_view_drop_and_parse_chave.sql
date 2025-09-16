-- NFe — ajustar view (DROP + CREATE) e extrair numero/serie/modelo da chave
-- v1.0 - 2025-09-16

BEGIN;

-- 0) Garantir colunas mínimas (idempotente)
ALTER TABLE public.nfe_data
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao DATE,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS valor_total NUMERIC(14,2);

-- 1) Função: parse da chave de acesso (44 dígitos)
-- Retorna: cUF (2), aamm (4), cnpj (14), modelo (2), serie (3), numero (9), tpEmis (1), cNF (8), cDV (1)
CREATE OR REPLACE FUNCTION public.fn_nfe_parse_chave(p_chave TEXT)
RETURNS TABLE(
  cuf TEXT, aamm TEXT, cnpj TEXT, modelo TEXT, serie TEXT, numero TEXT, tpemis TEXT, cnf TEXT, cdv TEXT
)
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF p_chave IS NULL OR length(regexp_replace(p_chave, '\D', '', 'g')) <> 44 THEN
    RAISE EXCEPTION 'Chave de acesso inválida (esperado 44 dígitos): %', p_chave USING ERRCODE = '22023';
  END IF;

  -- Remove qualquer caractere não numérico
  p_chave := regexp_replace(p_chave, '\D', '', 'g');

  RETURN QUERY
  SELECT 
    substr(p_chave, 1, 2)   AS cuf,
    substr(p_chave, 3, 4)   AS aamm,
    substr(p_chave, 7, 14)  AS cnpj,
    substr(p_chave, 21, 2)  AS modelo,
    substr(p_chave, 23, 3)  AS serie,
    substr(p_chave, 26, 9)  AS numero,
    substr(p_chave, 35, 1)  AS tpemis,
    substr(p_chave, 36, 8)  AS cnf,
    substr(p_chave, 44, 1)  AS cdv;
END
$fn$;

-- 2) Preenche numero/serie/modelo/data_emissao a partir da chave, se nulos
-- data_emissao: criamos usando AAMM -> primeiro dia daquele mês (YYMM -> 20YY-MM-01)
WITH parsed AS (
  SELECT 
    n.chave_acesso,
    (public.fn_nfe_parse_chave(n.chave_acesso)).*
  FROM public.nfe_data n
)
UPDATE public.nfe_data n
SET 
  numero       = COALESCE(n.numero, p.numero),
  serie        = COALESCE(n.serie,  p.serie),
  modelo       = COALESCE(n.modelo, p.modelo),
  data_emissao = COALESCE(
                   n.data_emissao,
                   to_date('20' || substr(p.aamm,1,2) || '-' || substr(p.aamm,3,2) || '-01','YYYY-MM-DD')
                 )
FROM parsed p
WHERE p.chave_acesso = n.chave_acesso;

-- 3) Ajuste da view: DROP antes de CREATE para poder mudar colunas
DROP VIEW IF EXISTS public.vw_nfe_conciliada;

-- 3.1) Criar versão COMPLETA se existir parcelas_conta_pagar; senão, LIGHT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='parcelas_conta_pagar'
  ) THEN
    EXECUTE $v$
      CREATE VIEW public.vw_nfe_conciliada AS
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
      CREATE VIEW public.vw_nfe_conciliada AS
      SELECT 
        n.chave_acesso,
        n.numero,
        n.serie,
        n.data_emissao,
        n.modelo,
        n.emitente,
        n.destinatario,
        COALESCE(n.valor_total, (n.valores->>'total')::numeric) AS total_nfe,
        NULL::numeric  AS total_parcelas,
        NULL::integer  AS qtd_parcelas,
        NULL::numeric  AS diferenca
      FROM public.nfe_data n;
    $v$;
  END IF;
END
$$;

COMMIT;
