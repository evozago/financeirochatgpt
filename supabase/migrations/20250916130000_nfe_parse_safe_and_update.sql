-- NFe — função de parse "safe" (não lança) + UPDATE filtrado por chave válida (44 dígitos)
-- v1.0 - 2025-09-16

BEGIN;

-- 1) Função SAFE: retorna NULLs quando a chave não possui 44 dígitos numéricos
CREATE OR REPLACE FUNCTION public.fn_nfe_parse_chave_safe(p_chave TEXT)
RETURNS TABLE(
  cuf TEXT, aamm TEXT, cnpj TEXT, modelo TEXT, serie TEXT, numero TEXT, tpemis TEXT, cnf TEXT, cdv TEXT
)
LANGUAGE plpgsql
AS $fn$
DECLARE
  s TEXT;
BEGIN
  s := regexp_replace(coalesce(p_chave, ''), '\D', '', 'g'); -- só dígitos
  IF length(s) <> 44 THEN
    -- retorna vazio (tudo NULL) sem erro
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    substr(s,  1,  2) AS cuf,
    substr(s,  3,  4) AS aamm,
    substr(s,  7, 14) AS cnpj,
    substr(s, 21,  2) AS modelo,
    substr(s, 23,  3) AS serie,
    substr(s, 26,  9) AS numero,
    substr(s, 35,  1) AS tpemis,
    substr(s, 36,  8) AS cnf,
    substr(s, 44,  1) AS cdv;
END
$fn$;

-- 2) UPDATE somente para linhas com chave válida (44 dígitos) e campos ainda nulos
WITH parsed AS (
  SELECT 
    n.chave_acesso,
    (public.fn_nfe_parse_chave_safe(n.chave_acesso)).*
  FROM public.nfe_data n
)
UPDATE public.nfe_data n
SET 
  numero       = COALESCE(n.numero, parsed.numero),
  serie        = COALESCE(n.serie,  parsed.serie),
  modelo       = COALESCE(n.modelo, parsed.modelo),
  data_emissao = COALESCE(
                   n.data_emissao,
                   CASE 
                     WHEN parsed.aamm IS NOT NULL 
                     THEN to_date('20' || substr(parsed.aamm,1,2) || '-' || substr(parsed.aamm,3,2) || '-01','YYYY-MM-DD')
                     ELSE NULL
                   END
                 )
FROM parsed
WHERE parsed.chave_acesso = n.chave_acesso
  AND parsed.numero IS NOT NULL;  -- só atualiza chaves válidas

COMMIT;
