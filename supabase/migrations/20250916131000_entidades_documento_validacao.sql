-- Entidades — unicidade/validação CPF/CNPJ + normalização (só dígitos)
-- v1.0 - 2025-09-16

BEGIN;

-- 0) util: manter só dígitos
CREATE OR REPLACE FUNCTION public.only_digits(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT regexp_replace(coalesce(p_text,''), '\D', '', 'g')
$fn$;

-- 1) valida CPF (11 dígitos) — retorna TRUE se válido
CREATE OR REPLACE FUNCTION public.cpf_is_valid(p_doc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  s TEXT := public.only_digits(p_doc);
  d int[]; i int; sum1 int := 0; sum2 int := 0; dv1 int; dv2 int;
BEGIN
  IF length(s) <> 11 THEN RETURN FALSE; END IF;
  -- rejeita sequências iguais (000…/111… etc.)
  IF s ~ '^(.)\1{10}$' THEN RETURN FALSE; END IF;

  d := string_to_array(s,'')::int[];

  FOR i IN 1..9 LOOP sum1 := sum1 + d[i] * (11 - i); END LOOP;
  dv1 := (sum1 * 10) % 11; IF dv1 = 10 THEN dv1 := 0; END IF;

  FOR i IN 1..10 LOOP sum2 := sum2 + d[i] * (12 - i); END LOOP;
  dv2 := (sum2 * 10) % 11; IF dv2 = 10 THEN dv2 := 0; END IF;

  RETURN (dv1 = d[10] AND dv2 = d[11]);
END
$fn$;

-- 2) valida CNPJ (14 dígitos) — retorna TRUE se válido
CREATE OR REPLACE FUNCTION public.cnpj_is_valid(p_doc TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  s TEXT := public.only_digits(p_doc);
  d int[]; i int; w int[] := ARRAY[5,4,3,2,9,8,7,6,5,4,3,2];
  sum1 int := 0; sum2 int := 0; dv1 int; dv2 int;
BEGIN
  IF length(s) <> 14 THEN RETURN FALSE; END IF;
  -- rejeita sequências iguais
  IF s ~ '^(.)\1{13}$' THEN RETURN FALSE; END IF;

  d := string_to_array(s,'')::int[];

  FOR i IN 1..12 LOOP sum1 := sum1 + d[i] * w[i]; END LOOP;
  dv1 := 11 - (sum1 % 11); IF dv1 >= 10 THEN dv1 := 0; END IF;

  -- pesos para dv2 começam com 6
  w := ARRAY[6,5,4,3,2,9,8,7,6,5,4,3,2];
  FOR i IN 1..13 LOOP sum2 := sum2 + d[i] * w[i]; END LOOP;
  dv2 := 11 - (sum2 % 11); IF dv2 >= 10 THEN dv2 := 0; END IF;

  RETURN (dv1 = d[13] AND dv2 = d[14]);
END
$fn$;

-- 3) adicionar coluna normalizada
ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS documento_norm TEXT;

-- 4) trigger para manter documento_norm sempre normalizado
CREATE OR REPLACE FUNCTION public.entidades_set_documento_norm()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.documento_norm := NULLIF(public.only_digits(NEW.documento),'');
  RETURN NEW;
END
$fn$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_entidades_set_documento_norm'
  ) THEN
    CREATE TRIGGER tg_entidades_set_documento_norm
      BEFORE INSERT OR UPDATE OF documento ON public.entidades
      FOR EACH ROW EXECUTE FUNCTION public.entidades_set_documento_norm();
  END IF;
END
$$;

-- 5) popular documento_norm para registros atuais
UPDATE public.entidades
SET documento_norm = NULLIF(public.only_digits(documento),'')
WHERE documento_norm IS DISTINCT FROM NULLIF(public.only_digits(documento),'');

-- 6) checks por tipo (aceita NULL; valida quando preenchido)
ALTER TABLE public.entidades
  DROP CONSTRAINT IF EXISTS ck_entidades_doc_pf_pj_valid,
  ADD CONSTRAINT ck_entidades_doc_pf_pj_valid CHECK (
    documento_norm IS NULL OR
    (tipo_pessoa = 'FISICA'   AND length(documento_norm) = 11 AND public.cpf_is_valid(documento_norm)) OR
    (tipo_pessoa = 'JURIDICA' AND length(documento_norm) = 14 AND public.cnpj_is_valid(documento_norm))
  );

-- 7) índice único (evita duplicidade quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_entidades_documento_norm_notnull
  ON public.entidades(documento_norm)
  WHERE documento_norm IS NOT NULL;

-- 8) view de diagnóstico (inválidos / duplicados)
CREATE OR REPLACE VIEW public.vw_entidades_doc_invalidos AS
WITH base AS (
  SELECT 
    id, nome, tipo_pessoa, documento, documento_norm,
    CASE 
      WHEN documento_norm IS NULL THEN 'vazio'
      WHEN tipo_pessoa = 'FISICA'   AND NOT public.cpf_is_valid(documento_norm)  THEN 'cpf_invalido'
      WHEN tipo_pessoa = 'JURIDICA' AND NOT public.cnpj_is_valid(documento_norm) THEN 'cnpj_invalido'
      ELSE 'ok'
    END AS status
  FROM public.entidades
)
SELECT * FROM base WHERE status <> 'ok'
UNION ALL
SELECT e.*
FROM public.entidades e
JOIN (
  SELECT documento_norm
  FROM public.entidades
  WHERE documento_norm IS NOT NULL
  GROUP BY documento_norm
  HAVING count(*) > 1
) d USING (documento_norm);

COMMIT;
