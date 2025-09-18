-- ============================================================
-- Helpers de papéis e marcas (idempotentes)
-- v1.0 - 2025-09-18
-- ============================================================

BEGIN;

-- 0) Garante enum public.tipo_papel com subvalores básicos
DO $$
DECLARE
  enum_oid oid;
BEGIN
  SELECT t.oid INTO enum_oid
  FROM pg_type t
  WHERE t.typname = 'tipo_papel' AND t.typnamespace = 'public'::regnamespace;

  IF enum_oid IS NULL THEN
    CREATE TYPE public.tipo_papel AS ENUM ('CLIENTE', 'FORNECEDOR', 'FUNCIONARIO');
  END IF;
END$$;

-- 1) Função ensure_papel (atribui papel idempotente)
CREATE OR REPLACE FUNCTION public.ensure_papel(
  p_entidade_id BIGINT,
  p_papel TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.entidade_papel (entidade_id, papel)
  SELECT p_entidade_id, p_papel::public.tipo_papel
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_papel ep
    WHERE ep.entidade_id = p_entidade_id
      AND ep.papel = p_papel::public.tipo_papel
  );
END$$;

-- 2) Função attach_marca (anexa entidade a uma marca idempotentemente)
CREATE OR REPLACE FUNCTION public.attach_marca(
  p_entidade_id BIGINT,
  p_marca TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_marca_id BIGINT;
BEGIN
  SELECT id INTO v_marca_id
  FROM public.marcas
  WHERE nome = p_marca;

  IF v_marca_id IS NULL THEN
    INSERT INTO public.marcas (nome, ativo) VALUES (p_marca, true)
    RETURNING id INTO v_marca_id;
  END IF;

  INSERT INTO public.entidade_marca(entidade_id, marca_id)
  SELECT p_entidade_id, v_marca_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_marca em
    WHERE em.entidade_id = p_entidade_id AND em.marca_id = v_marca_id
  );
END$$;

COMMIT;
