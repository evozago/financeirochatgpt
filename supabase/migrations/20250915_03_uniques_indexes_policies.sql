-- financeirolb: unicidade (CPF/CNPJ), índices úteis e RLS básico
-- v1.0 - 2025-09-15

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
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entidade_papel ENABLE ROW LEVEL SECURITY;

-- Função is_admin() (cria somente se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'is_admin' AND n.nspname = 'public'
  ) THEN
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
      select exists (
        select 1 from public.user_organizacoes uo
        where uo.user_id = auth.uid()
          and lower(coalesce(uo.role,'')) in ('admin','owner','superadmin')
      );
    $$;
  END IF;
END $$;

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
