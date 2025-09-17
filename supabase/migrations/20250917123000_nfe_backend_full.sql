-- NFe backend completo (tabelas, views, função de conciliação, storage)
-- v1.0 - 2025-09-17

BEGIN;

-- ===============================
-- TABELAS
-- ===============================

-- Tabela principal de NFe (mínima)
CREATE TABLE IF NOT EXISTS public.nfe_data (
  chave_acesso TEXT PRIMARY KEY,        -- 44 dígitos
  emitente TEXT,
  destinatario TEXT,
  numero TEXT,
  serie TEXT,
  modelo TEXT,
  data_emissao DATE,
  valor_total NUMERIC(14,2),
  valores JSONB,                        -- total/produto/desconto/etc (opcional)
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relação NFe ↔ parcela (muitos-para-muitos se quiser)
CREATE TABLE IF NOT EXISTS public.nfe_parcela_link (
  chave_acesso TEXT NOT NULL REFERENCES public.nfe_data(chave_acesso) ON DELETE CASCADE,
  parcela_id   BIGINT NOT NULL REFERENCES public.parcelas_conta_pagar(id) ON DELETE CASCADE,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chave_acesso, parcela_id)
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_nfe_data_emissao ON public.nfe_data(data_emissao);
CREATE INDEX IF NOT EXISTS idx_nfe_link_parcela ON public.nfe_parcela_link(parcela_id);

-- ===============================
-- VIEWS
-- ===============================

-- Pendentes = NFe sem vínculo
CREATE OR REPLACE VIEW public.vw_nfe_pendentes AS
SELECT
  n.chave_acesso,
  n.emitente,
  n.destinatario,
  n.numero,
  n.serie,
  n.modelo,
  n.data_emissao,
  n.valor_total,
  n.valores
FROM public.nfe_data n
WHERE NOT EXISTS (
  SELECT 1 FROM public.nfe_parcela_link l WHERE l.chave_acesso = n.chave_acesso
);

-- Conciliada = NFe vinculada a parcelas; mostra somatório e diferença
CREATE OR REPLACE VIEW public.vw_nfe_conciliada AS
WITH soma AS (
  SELECT
    l.chave_acesso,
    SUM(p.valor_parcela) AS total_parcelas,
    COUNT(*)             AS qtd_parcelas
  FROM public.nfe_parcela_link l
  JOIN public.parcelas_conta_pagar p ON p.id = l.parcela_id
  GROUP BY l.chave_acesso
)
SELECT
  n.chave_acesso,
  n.numero,
  n.serie,
  n.data_emissao,
  n.emitente,
  n.destinatario,
  n.valor_total     AS total_nfe,
  s.total_parcelas,
  s.qtd_parcelas,
  (COALESCE(n.valor_total,0) - COALESCE(s.total_parcelas,0)) AS diferenca
FROM public.nfe_data n
LEFT JOIN soma s ON s.chave_acesso = n.chave_acesso
WHERE EXISTS (SELECT 1 FROM public.nfe_parcela_link l WHERE l.chave_acesso = n.chave_acesso);

-- ===============================
-- FUNÇÃO: conciliar NFe
-- ===============================
-- - p_conta_id informado: vincula a NFe a TODAS as parcelas da conta (upsert)
-- - p_criar_conta = true: tenta criar conta + 1 parcela (valor_total) e vincular
-- - Retorna: ok, msg, conta_id
-- - Tolerante aos NOT NULL: se não conseguir criar, retorna msg sem travar
CREATE OR REPLACE FUNCTION public.fn_conciliar_nfe(
  p_chave TEXT,
  p_conta_id BIGINT,
  p_criar_conta BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(ok boolean, msg text, conta_id bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nfe RECORD;
  v_has_contas BOOLEAN;
  v_has_parcelas BOOLEAN;
  v_has_categoria_col BOOLEAN;
  v_conta_id BIGINT;
  v_msg TEXT := '';
BEGIN
  -- valida existência da NFe
  SELECT * INTO v_nfe FROM public.nfe_data WHERE chave_acesso = p_chave;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NFe não encontrada: '||COALESCE(p_chave,'<null>'), NULL::BIGINT;
    RETURN;
  END IF;

  -- checa se tabelas-alvo existem
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='contas_pagar_corporativas'
  ) INTO v_has_contas;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='parcelas_conta_pagar'
  ) INTO v_has_parcelas;

  IF NOT v_has_contas OR NOT v_has_parcelas THEN
    RETURN QUERY SELECT false, 'Tabelas de contas/parcelas não existem neste schema.', NULL::BIGINT;
    RETURN;
  END IF;

  -- 1) criar conta se solicitado e não veio p_conta_id
  IF p_criar_conta IS TRUE AND (p_conta_id IS NULL OR p_conta_id = 0) THEN
    -- coluna categoria_id existe?
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='contas_pagar_corporativas'
        AND column_name='categoria_id'
    ) INTO v_has_categoria_col;

    BEGIN
      IF v_has_categoria_col THEN
        INSERT INTO public.contas_pagar_corporativas
          (filial_id, credor_id, descricao, valor_total, categoria_id, dt_vencimento, status)
        VALUES
          (NULL, NULL, CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')), v_nfe.valor_total, NULL, v_nfe.data_emissao, 'aberta')
        RETURNING id INTO v_conta_id;
      ELSE
        INSERT INTO public.contas_pagar_corporativas
          (filial_id, credor_id, descricao, valor_total, dt_vencimento, status)
        VALUES
          (NULL, NULL, CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')), v_nfe.valor_total, v_nfe.data_emissao, 'aberta')
        RETURNING id INTO v_conta_id;
      END IF;

      -- cria 1 parcela com o valor da NFe (se houver valor)
      IF v_nfe.valor_total IS NOT NULL THEN
        INSERT INTO public.parcelas_conta_pagar
          (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
        VALUES
          (v_conta_id, 1, v_nfe.data_emissao, v_nfe.valor_total, 'a_vencer');
      END IF;

      v_msg := 'Conta criada e parcela gerada; ';
    EXCEPTION WHEN others THEN
      -- se sua tabela tiver NOT NULL em filial_id/credor_id, cai aqui; não travar
      RETURN QUERY SELECT false, 'Não foi possível criar conta automaticamente. Verifique NOT NULL (filial_id/credor_id).', NULL::BIGINT;
      RETURN;
    END;
  ELSE
    v_conta_id := p_conta_id;
  END IF;

  -- 2) se temos conta, vincular TODAS as parcelas dela à NFe (upsert)
  IF v_conta_id IS NOT NULL AND v_conta_id <> 0 THEN
    INSERT INTO public.nfe_parcela_link (chave_acesso, parcela_id)
    SELECT p_chave, p.id
    FROM public.parcelas_conta_pagar p
    WHERE p.conta_pagar_id = v_conta_id
    ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;

    RETURN QUERY SELECT true, COALESCE(v_msg,'')||'Vinculada à conta #'||v_conta_id, v_conta_id;
  END IF;

  -- caso não tenha conta e também não foi possível criar
  RETURN QUERY SELECT false, 'Nenhuma conta informada e não foi possível criar automaticamente.', NULL::BIGINT;
END $$;

-- ===============================
-- STORAGE (bucket nfe-xml) + policies DEV (idempotente)
-- ===============================
-- A criação do bucket via SQL pode não estar disponível no seu projeto;
-- neste caso, crie manualmente no Studio: Storage → New bucket → id: nfe-xml (private)
-- As policies abaixo funcionam mesmo assim.

-- READ
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'nfe_xml_read_auth'
  ) THEN
    CREATE POLICY nfe_xml_read_auth
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'nfe-xml');
  END IF;
END$$;

-- WRITE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'nfe_xml_write_auth'
  ) THEN
    CREATE POLICY nfe_xml_write_auth
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'nfe-xml');
  END IF;
END$$;

-- DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'nfe_xml_delete_auth'
  ) THEN
    CREATE POLICY nfe_xml_delete_auth
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'nfe-xml');
  END IF;
END$$;

COMMIT;
