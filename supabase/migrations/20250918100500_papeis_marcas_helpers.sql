-- ======================================================================
-- Helpers de papéis e marcas (idempotentes)
-- v1.0 - 2025-09-18
-- ======================================================================

BEGIN;

-- 0) Garante enum public.tipo_papel com sub-valores necessários
DO $$
DECLARE
  v_exists boolean;
  v text;
BEGIN
  -- cria o enum caso não exista
  PERFORM 1
  FROM pg_type t
  WHERE t.typname = 'tipo_papel' AND t.typnamespace = 'public'::regnamespace;

  IF NOT FOUND THEN
    EXECUTE 'CREATE TYPE public.tipo_papel AS ENUM (''CLIENTE'',''FORNECEDOR'',''FUNCIONARIO'')';
  END IF;

  -- adiciona valores novos se faltarem
  FOREACH v IN ARRAY ARRAY['FORNECEDOR_REVENDA','FORNECEDOR_CONSUMO','PROPRIETARIO']
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'tipo_papel'
        AND t.typnamespace = 'public'::regnamespace
        AND e.enumlabel = v
    ) INTO v_exists;

    IF NOT v_exists THEN
      EXECUTE format('ALTER TYPE public.tipo_papel ADD VALUE IF NOT EXISTS %L', v);
    END IF;
  END LOOP;
END
$$;

-- 1) TABELAS auxiliares de marcas (se ainda não existirem)
CREATE TABLE IF NOT EXISTS public.marcas (
  id           BIGSERIAL PRIMARY KEY,
  nome         TEXT NOT NULL UNIQUE,
  descricao    TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entidade_marca (
  id          BIGSERIAL PRIMARY KEY,
  entidade_id BIGINT NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  marca_id    BIGINT NOT NULL REFERENCES public.marcas(id)    ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entidade_id, marca_id)
);

-- índices
CREATE INDEX IF NOT EXISTS idx_entidade_marca_entidade ON public.entidade_marca(entidade_id);
CREATE INDEX IF NOT EXISTS idx_entidade_marca_marca    ON public.entidade_marca(marca_id);
CREATE INDEX IF NOT EXISTS idx_marcas_ativo            ON public.marcas(ativo) WHERE ativo;

-- 2) Habilita RLS (policies simples / leitura aberta, escrita liberada — ajuste depois)
ALTER TABLE public.marcas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entidade_marca ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marcas' AND policyname='marcas_select_auth'
  ) THEN
    CREATE POLICY marcas_select_auth
      ON public.marcas FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='marcas' AND policyname='marcas_write_admin'
  ) THEN
    CREATE POLICY marcas_write_admin
      ON public.marcas FOR ALL USING (is_admin()) WITH CHECK (is_admin());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidade_marca' AND policyname='entidade_marca_select_auth'
  ) THEN
    CREATE POLICY entidade_marca_select_auth
      ON public.entidade_marca FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidade_marca' AND policyname='entidade_marca_write_auth'
  ) THEN
    CREATE POLICY entidade_marca_write_auth
      ON public.entidade_marca FOR ALL USING (true) WITH CHECK (true);
  END IF;
END$$;

-- 3) Função helper: garante/insere um papel para a entidade (idempotente)
CREATE OR REPLACE FUNCTION public.ensure_papel(
  p_entidade_id BIGINT,
  p_papel       TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- tenta inserir apenas se não existir
  INSERT INTO public.entidade_papel (entidade_id, papel)
  SELECT p_entidade_id, p_papel::public.tipo_papel
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.entidade_papel ep
    WHERE ep.entidade_id = p_entidade_id
      AND ep.papel       = p_papel::public.tipo_papel
  );
END
$$;

-- 4) Função helper: anexa uma marca a uma entidade (idempotente)
CREATE OR REPLACE FUNCTION public.attach_marca(
  p_entidade_id BIGINT,
  p_marca       TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_marca_id BIGINT;
BEGIN
  -- localiza a marca pelo nome (ajuste se quiser normalizar)
  SELECT id INTO v_marca_id
  FROM public.marcas
  WHERE nome = p_marca;

  IF v_marca_id IS NULL THEN
    RAISE NOTICE 'Marca % não encontrada em public.marcas', p_marca;
    RETURN;
  END IF;

  INSERT INTO public.entidade_marca (entidade_id, marca_id)
  SELECT p_entidade_id, v_marca_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.entidade_marca em
    WHERE em.entidade_id = p_entidade_id
      AND em.marca_id    = v_marca_id
  );
END
$$;

-- 5) Comentários (documentação)
COMMENT ON TABLE public.marcas IS 'Marcas/categorias de produtos para classificação de entidades.';
COMMENT ON TABLE public.entidade_marca IS 'Relacionamento many-to-many entre entidades e marcas.';
COMMENT ON FUNCTION public.ensure_papel(BIGINT, TEXT) IS 'Garante (idempotente) um papel do enum tipo_papel para a entidade.';
COMMENT ON FUNCTION public.attach_marca(BIGINT, TEXT) IS 'Anexa uma marca existente à entidade (idempotente).';

COMMIT;
