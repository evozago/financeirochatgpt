-- ===============================================
-- Marcas, sub-papéis e Raio-X de Entidade
-- v1.0 - 2025-09-17
-- Idempotente
-- ===============================================

BEGIN;

-- ------------------------------------------------
-- 0) util: função set_atualizado_em() (se não existir)
-- ------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'set_atualizado_em'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE $f$
      CREATE FUNCTION public.set_atualizado_em()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $tg$
      BEGIN
        NEW.atualizado_em := now();
        RETURN NEW;
      END
      $tg$;
    $f$;
  END IF;
END$$;

-- ------------------------------------------------
-- 1) TABELA marcas
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.marcas (
  id            BIGSERIAL PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  descricao     TEXT,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- gatilho de atualização
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tg_marcas_updated_at'
  ) THEN
    CREATE TRIGGER tg_marcas_updated_at
      BEFORE UPDATE ON public.marcas
      FOR EACH ROW
      EXECUTE FUNCTION public.set_atualizado_em();
  END IF;
END$$;

-- ------------------------------------------------
-- 2) TABELA de relação N:N entidade_marca
-- ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entidade_marca (
  entidade_id BIGINT NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  marca_id    BIGINT NOT NULL REFERENCES public.marcas(id)    ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entidade_id, marca_id)
);

-- índices
CREATE INDEX IF NOT EXISTS idx_entidade_marca_entidade ON public.entidade_marca(entidade_id);
CREATE INDEX IF NOT EXISTS idx_entidade_marca_marca    ON public.entidade_marca(marca_id);
CREATE INDEX IF NOT EXISTS idx_marcas_ativo            ON public.marcas(ativo) WHERE ativo = true;

-- ------------------------------------------------
-- 3) Coluna metadados em entidades (se não existir)
-- ------------------------------------------------
ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS metadados JSONB;
CREATE INDEX IF NOT EXISTS idx_entidades_metadados ON public.entidades USING GIN(metadados);

-- ------------------------------------------------
-- 4) Sub-papéis: adiciona valores ao enum tipo_papel somente se faltarem
-- ------------------------------------------------
DO $$
DECLARE
  enum_oid oid;
  v text;
BEGIN
  SELECT t.oid INTO enum_oid
  FROM pg_type t
  WHERE t.typname = 'tipo_papel';

  IF enum_oid IS NULL THEN
    RAISE EXCEPTION 'Enum tipo_papel não existe. Crie-o antes ou ajuste este script.';
  END IF;

  FOREACH v IN ARRAY ARRAY['FORNECEDOR_REVENDA','FORNECEDOR_CONSUMO','PROPRIETARIO']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e WHERE e.enumtypid = enum_oid AND e.enumlabel = v
    ) THEN
      EXECUTE format('ALTER TYPE public.tipo_papel ADD VALUE %L', v);
    END IF;
  END LOOP;
END$$;

-- ------------------------------------------------
-- 5) Helpers padronizados (sem duplicar dados)
-- ------------------------------------------------

-- 5.1 garante um papel (não duplica)
CREATE OR REPLACE FUNCTION public.ensure_papel(p_entidade_id BIGINT, p_papel public.tipo_papel)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.entidade_papel(entidade, papel)
  SELECT p_entidade_id, p_papel
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_papel ep
    WHERE ep.entidade = p_entidade_id
      AND ep.papel    = p_papel
  );
END$$;

-- 5.2 anexa marca (não duplica)
CREATE OR REPLACE FUNCTION public.attach_marca(p_entidade_id BIGINT, p_marca TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_marca_id BIGINT;
BEGIN
  IF p_marca IS NULL OR length(trim(p_marca)) = 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.marcas(nome)
  VALUES (p_marca)
  ON CONFLICT (nome) DO NOTHING;

  SELECT id INTO v_marca_id FROM public.marcas WHERE nome = p_marca;

  INSERT INTO public.entidade_marca(entidade_id, marca_id)
  SELECT p_entidade_id, v_marca_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.entidade_marca
    WHERE entidade_id = p_entidade_id
      AND marca_id    = v_marca_id
  );
END$$;

-- ------------------------------------------------
-- 6) RLS (leitura liberada; escrita p/ admin)
-- ------------------------------------------------
ALTER TABLE public.marcas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entidade_marca ENABLE ROW LEVEL SECURITY;

-- marcas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'marcas_select_auth') THEN
    CREATE POLICY marcas_select_auth ON public.marcas
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'marcas_write_admin') THEN
    CREATE POLICY marcas_write_admin ON public.marcas
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END$$;

-- entidade_marca
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'entidade_marca_select_auth') THEN
    CREATE POLICY entidade_marca_select_auth ON public.entidade_marca
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'entidade_marca_write_admin') THEN
    CREATE POLICY entidade_marca_write_admin ON public.entidade_marca
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END$$;

-- ------------------------------------------------
-- 7) View de Raio-X unificado da entidade
--    (puxe tudo da mesma base; navegação drill-down)
-- ------------------------------------------------
CREATE OR REPLACE VIEW public.vw_entidade_timeline AS
SELECT
  'nfe'::text                   AS origem,
  n.chave_acesso               AS ref,
  n.data_emissao               AS data,
  n.valor_total                AS valor,
  e.id                         AS entidade_id,
  e.nome                       AS entidade_nome,
  NULL::BIGINT                 AS conta_id,
  NULL::BIGINT                 AS parcela_id,
  jsonb_build_object(
    'numero', n.numero,
    'serie',  n.serie,
    'modelo', n.modelo
  )                             AS meta
FROM public.nfe_data n
JOIN public.entidades e
  ON public.only_digits(e.documento) = public.only_digits(n.cnpj_destinatario)

UNION ALL
SELECT
  'conta'::text,
  concat('conta#', c.id),
  c.dt_vencimento,
  c.valor_total,
  c.filial_id,
  (SELECT nome FROM public.entidades e2 WHERE e2.id = c.filial_id),
  c.id,
  NULL::BIGINT,
  jsonb_build_object('status', c.status) AS meta
FROM public.contas_pagar_corporativas c

UNION ALL
SELECT
  'parcela'::text,
  concat('parcela#', p.id),
  p.data_vencimento,
  p.valor_parcela,
  c.filial_id,
  (SELECT nome FROM public.entidades e2 WHERE e2.id = c.filial_id),
  p.conta_pagar_id,
  p.id,
  jsonb_build_object('status', p.status, 'pago_em', p.pago_em) AS meta
FROM public.parcelas_conta_pagar p
JOIN public.contas_pagar_corporativas c ON c.id = p.conta_pagar_id;

COMMENT ON VIEW public.vw_entidade_timeline IS
  'Linha do tempo unificada por entidade (NFes, contas e parcelas)';

-- ------------------------------------------------
-- 8) Seeds de marcas (exemplo)
-- ------------------------------------------------
INSERT INTO public.marcas (nome, descricao) VALUES
  ('Vestuário Masculino','Roupas e acessórios masculinos'),
  ('Vestuário Feminino','Roupas e acessórios femininos'),
  ('Calçados','Sapatos, tênis e sandálias'),
  ('Acessórios','Bolsas, cintos, bijuterias'),
  ('Infantil','Roupas e acessórios infantis')
ON CONFLICT DO NOTHING;

-- documentação
COMMENT ON TABLE  public.marcas         IS 'Marcas/categorias de produtos para classificação de entidades';
COMMENT ON TABLE  public.entidade_marca IS 'Relação N:N entre entidades e marcas';
COMMENT ON COLUMN public.entidades.metadados IS 'JSONB livre (ex.: {"proprietario":true,"observacoes":"..."} )';

COMMIT;
