-- Helpers idempotentes para papéis e marcas
-- v1.0 - 2025-09-18

BEGIN;

-- Função ensure_papel: garante que a entidade tenha o papel informado
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
END;
$$;

-- Função attach_marca: vincula entidade a uma marca pelo nome
CREATE OR REPLACE FUNCTION public.attach_marca(
  p_entidade_id BIGINT,
  p_marca TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_marca_id BIGINT;
BEGIN
  SELECT id INTO v_marca_id FROM public.marcas WHERE nome = p_marca;

  IF v_marca_id IS NOT NULL THEN
    INSERT INTO public.entidade_marca(entidade_id, marca_id)
    SELECT p_entidade_id, v_marca_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.entidade_marca em
      WHERE em.entidade_id = p_entidade_id
        AND em.marca_id = v_marca_id
    );
  END IF;
END;
$$;

COMMIT;
