BEGIN;

CREATE OR REPLACE FUNCTION public.fn_nfe_parse_chave_safe(p_chave TEXT)
RETURNS TABLE(
  cuf TEXT, aamm TEXT, cnpj TEXT, modelo TEXT, serie TEXT, numero TEXT, tpemis TEXT, cnf TEXT, cdv TEXT
)
LANGUAGE plpgsql
AS $fn$
DECLARE s TEXT;
BEGIN
  s := regexp_replace(coalesce(p_chave, ''), '\D', '', 'g');
  IF length(s) <> 44 THEN RETURN; END IF;

  RETURN QUERY
  SELECT 
    substr(s,1,2), substr(s,3,4), substr(s,7,14),
    substr(s,21,2), substr(s,23,3), substr(s,26,9),
    substr(s,35,1), substr(s,36,8), substr(s,44,1);
END
$fn$;

WITH parsed AS (
  SELECT n.chave_acesso, (public.fn_nfe_parse_chave_safe(n.chave_acesso)).*
  FROM public.nfe_data n
)
UPDATE public.nfe_data n
SET 
  numero       = COALESCE(n.numero, parsed.numero),
  serie        = COALESCE(n.serie,  parsed.serie),
  modelo       = COALESCE(n.modelo, parsed.modelo),
  data_emissao = COALESCE(
                   n.data_emissao,
                   CASE WHEN parsed.aamm IS NOT NULL
                        THEN to_date('20'||substr(parsed.aamm,1,2)||'-'||substr(parsed.aamm,3,2)||'-01','YYYY-MM-DD')
                   END
                 )
FROM parsed
WHERE parsed.chave_acesso = n.chave_acesso
  AND parsed.numero IS NOT NULL;

COMMIT;
