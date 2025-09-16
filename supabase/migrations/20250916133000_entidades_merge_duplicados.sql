-- Merge de entidades duplicadas (move FKs e remove duplicata)
-- v1.0 - 2025-09-16

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_merge_entidades(p_keep_id BIGINT, p_merge_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_keep_tipo  TEXT;
  v_merge_tipo TEXT;
  v_keep_doc   TEXT;
  v_merge_doc  TEXT;
BEGIN
  IF p_keep_id IS NULL OR p_merge_id IS NULL OR p_keep_id = p_merge_id THEN
    RAISE EXCEPTION 'IDs inválidos: keep_id=%, merge_id=%', p_keep_id, p_merge_id USING ERRCODE='22023';
  END IF;

  SELECT tipo_pessoa, documento_norm INTO v_keep_tipo, v_keep_doc  FROM public.entidades WHERE id = p_keep_id;
  SELECT tipo_pessoa, documento_norm INTO v_merge_tipo, v_merge_doc FROM public.entidades WHERE id = p_merge_id;

  IF v_keep_tipo IS NULL OR v_merge_tipo IS NULL THEN
    RAISE EXCEPTION 'Entidade(s) não encontrada(s)'; 
  END IF;

  IF v_keep_tipo <> v_merge_tipo THEN
    RAISE EXCEPTION 'Tipos diferentes: keep=% merge=%', v_keep_tipo, v_merge_tipo USING ERRCODE='22023';
  END IF;

  -- Evitar conflito de UNIQUE (documento_norm) se ambos tiverem documento
  IF v_keep_doc IS NOT NULL AND v_merge_doc IS NOT NULL AND v_keep_doc <> v_merge_doc THEN
    RAISE EXCEPTION 'Conflito de documento_norm: keep=% merge=%', v_keep_doc, v_merge_doc USING ERRCODE='23505';
  END IF;

  -- Unificar documento_norm/documento se o "keep" estiver vazio e o "merge" tiver
  UPDATE public.entidades k
  SET documento = COALESCE(k.documento, m.documento),
      documento_norm = COALESCE(k.documento_norm, m.documento_norm)
  FROM public.entidades m
  WHERE k.id = p_keep_id AND m.id = p_merge_id;

  -- ======= MOVER FKs (só se as tabelas existirem) =======

  -- AP: contas a pagar (credor)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='contas_pagar_corporativas' AND column_name='credor_id') THEN
    UPDATE public.contas_pagar_corporativas SET credor_id = p_keep_id WHERE credor_id = p_merge_id;
  END IF;

  -- Vendas: metas_mensais
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='metas_mensais' AND column_name='entidade_id') THEN
    UPDATE public.metas_mensais SET entidade_id = p_keep_id WHERE entidade_id = p_merge_id;
  END IF;

  -- Vendas: vendas_mensais
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema='public' AND table_name='vendas_mensais' AND column_name='entidade_id') THEN
    UPDATE public.vendas_mensais SET entidade_id = p_keep_id WHERE entidade_id = p_merge_id;
  END IF;

  -- (se você tiver outras FKs, copie o padrão acima e acrescente aqui)

  -- ======= REMOVER a duplicata =======
  DELETE FROM public.entidades WHERE id = p_merge_id;

  RETURN format('OK: entidade %s absorveu %s', p_keep_id, p_merge_id);
END
$fn$;

COMMIT;
