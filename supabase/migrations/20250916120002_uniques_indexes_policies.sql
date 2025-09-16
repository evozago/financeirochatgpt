-- financeirolb: unicidade (CPF/CNPJ), índices úteis e RLS básico
-- v1.2 - 2025-09-16 (fix: is_admin() sem dependência obrigatória de user_organizacoes)

BEGIN;

-- Unicidade de documento quando não-nulo (CPF/CNPJ)
CREATE UNIQUE INDEX IF NOT EXISTS uq_entidades_documento_notnull
  ON public.entidades(documento) WHERE documento IS NOT NULL;

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_entidades_ativo ON public.entidades(ativo);
CREATE INDEX IF NOT EXISTS idx_entidade_papel_papel ON public.entidade_papel(papel);

-- Se a tabela nfe_data existir, cria chave única para chave de acesso
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='nfe_data'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_data_chave ON public.nfe_data(chave_acesso);
  END IF;
END $$;

-- RLS básico (ajuste depois para organização/filial)
ALTER TABLE IF EXISTS public.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.entidade_papel ENABLE ROW LEVEL SECURITY;

-- Função is_admin():
--  1) tenta ler role do JWT (user_metadata.role ou app_metadata.role)
--  2) se existir a tabela user_organizacoes, também aceita roles nela
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  claims jsonb := coalesce(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
  role_claim text := lower(coalesce(
    claims->'user_metadata'->>'role',
    claims->'app_metadata'->>'role',
    ''
  ));
  has_table boolean;
  is_tbl_admin boolean := false;
BEGIN
  -- 1) JWT: admin?
  IF role_claim IN ('admin','owner','superadmin') THEN
    RETURN true;
  END IF;

  -- 2) Tabela user_organizacoes existe?
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='user_organizacoes'
  ) INTO has_table;

  IF has_table THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_organizacoes uo
      WHERE uo.user_id = auth.uid()
        AND lower(coalesce(uo.role,'')) IN ('admin','owner','superadmin')
    ) INTO is_tbl_admin;

    IF is_tbl_admin THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END
$fn$;

-- Policies (SELECT para autenticados; alterações só admin)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidades' AND policyname='entidades_select_auth') THEN
    CREATE POLICY entidades_select_auth ON public.entidades
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidades' AND policyname='entidades_mod_admin') THEN
    CREATE POLICY entidades_mod_admin ON public.entidades
      FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidade_papel' AND policyname='entidade_papel_select_auth') THEN
    CREATE POLICY entidade_papel_select_auth ON public.entidade_papel
      FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='entidade_papel' AND policyname='entidade_papel_mod_admin') THEN
    CREATE POLICY entidade_papel_mod_admin ON public.entidade_papel
      FOR ALL TO authenticated
      USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

COMMIT;
