-- ===================================================================
-- Helpers de papéis e marcas (idempotentes)
-- v1.0 - 2025-09-18
-- ===================================================================

BEGIN;

-- 0) Garantir enum public.tipo_papel com subvalores (idempotente)
DO $$
DECLARE
  enum_oid oid;
  v text;
BEGIN
  SELECT t.oid INTO enum_oid
  FROM pg_type t
  WHERE t.typname = 'tipo_papel' AND t.typnamespace = 'public'::regnamespace;

  IF enum_oid IS NULL THEN
    RAISE EXCEPTION 'Enum tipo_papel não encontrado. Crie-o antes.';
  END IF;

  -- adiciona valores se não existirem
  FOR v IN SELECT * FROM (VALUES
      ('FORNECEDOR_REVENDA'),
      ('FORNECEDOR_CONSUMO'),
      ('PROPRIETARIO'),
      ('CLIENTE')
  ) s(val) LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.tipo_papel ADD VALUE IF NOT EXISTS %L', v.val);
    EXCEPTION WHEN OTHERS THEN
      -- ignore se já existe
      NULL;
    END;
  END LOOP;
END $$;

-- 1) Tabelas de marcas e relação entidade↔marca (se ainda não existirem)
CREATE TABLE IF NOT EXISTS public.marcas (
  id           BIGSERIAL PRIMARY KEY,
  nome         TEXT NOT NULL UNIQUE,
  descricao    TEXT,
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.entidade_marca (
  id BIGSERIAL PRIMARY KEY,
  entidade_id BIGINT NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  marca_id    BIGINT NOT NULL REFERENCES public.marcas(id)    ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entidade_id, marca_id)
);

-- 2) Trigger simples para atualizar updated_at em marcas
CREATE OR REPLACE FUNCTION public.set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_marcas_updated_at ON public.marcas;
CREATE TRIGGER trg_marcas_updated_at
  BEFORE UPDATE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.set_atualizado_em();

-- 3) RLS básico
ALTER TABLE public.marcas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entidade_marca ENABLE ROW LEVEL SECURITY;

-- leitura liberada / escrita para admin (ajuste conforme seu is_admin())
DROP POLICY IF EXISTS marcas_select_auth  ON public.marcas;
CREATE POLICY marcas_select_auth  ON public.marcas FOR SELECT USING (true);

DROP POLICY IF EXISTS marcas_write_admin  ON public.marcas;
CREATE POLICY marcas_write_admin  ON public.marcas FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS entidade_marca_select_auth ON public.entidade_marca;
CREATE POLICY entidade_marca_select_auth ON public.entidade_marca FOR SELECT USING (true);

DROP POLICY IF EXISTS entidade_marca_write_auth ON public.entidade_marca;
CREATE POLICY entidade_marca_write_auth ON public.entidade_marca FOR ALL
  USING (true) WITH CHECK (true);

-- 4) Índices úteis
CREATE INDEX IF NOT EXISTS idx_marcas_ativo              ON public.marcas(ativo) WHERE ativo;
CREATE INDEX IF NOT EXISTS idx_entidade_marca_entidade   ON public.entidade_marca(entidade_id);
CREATE INDEX IF NOT EXISTS idx_entidade_marca_marca      ON public.entidade_marca(marca_id);

-- 5) Helpers idempotentes

-- 5.1) Garante o papel informado para a entidade
CREATE OR REPLACE FUNCTION public.ensure_papel(p_entidade_id BIGINT, p_papel TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.entidade_papel (entidade_id, papel)
  SELECT p_entidade_id, p_papel::public.tipo_papel
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_papel ep
     WHERE ep.entidade_id = p_entidade_id
       AND ep.papel = p_papel::public.tipo_papel
  );
END $$;

-- 5.2) Anexa uma marca (por nome) a uma entidade, sem duplicar
CREATE OR REPLACE FUNCTION public.attach_marca(p_entidade_id BIGINT, p_marca TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_marca_id BIGINT;
BEGIN
  SELECT id INTO v_marca_id
  FROM public.marcas
  WHERE nome = p_marca;

  IF v_marca_id IS NULL THEN
    -- cria a marca se não existir
    INSERT INTO public.marcas (nome, descricao)
    VALUES (p_marca, NULL)
    RETURNING id INTO v_marca_id;
  END IF;

  INSERT INTO public.entidade_marca (entidade_id, marca_id)
  SELECT p_entidade_id, v_marca_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_marca em
     WHERE em.entidade_id = p_entidade_id
       AND em.marca_id    = v_marca_id
  );
END $$;

COMMENT ON FUNCTION public.ensure_papel(BIGINT, TEXT) IS
  'Garante que a entidade tenha o papel informado (idempotente). Use: SELECT public.ensure_papel(10, ''CLIENTE'');';
COMMENT ON FUNCTION public.attach_marca(BIGINT, TEXT) IS
  'Garante o vínculo entidade↔marca pelo nome (cria a marca se necessário). Use: SELECT public.attach_marca(10, ''Vestuário Feminino'');';

COMMIT;
