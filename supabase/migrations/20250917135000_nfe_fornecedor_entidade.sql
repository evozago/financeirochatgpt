-- NFe: vincular fornecedor (emitente) e entidade (destinatário)
-- v1.0 - 2025-09-17

BEGIN;

-- 1) Adicionar colunas na nfe_data
ALTER TABLE public.nfe_data
  ADD COLUMN IF NOT EXISTS cnpj_emitente TEXT,
  ADD COLUMN IF NOT EXISTS cnpj_destinatario TEXT;

CREATE INDEX IF NOT EXISTS idx_nfe_cnpj_emitente      ON public.nfe_data (cnpj_emitente);
CREATE INDEX IF NOT EXISTS idx_nfe_cnpj_destinatario  ON public.nfe_data (cnpj_destinatario);

-- 2) Helper: only_digits()
CREATE OR REPLACE FUNCTION public.only_digits(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p_text,''), '\D', '', 'g');
$$;

-- 3) ensure_entidade_by_cnpj(): cria/retorna entidade; aplica papel (se tabelas existirem)
CREATE OR REPLACE FUNCTION public.ensure_entidade_by_cnpj(
  p_cnpj TEXT,
  p_nome TEXT,
  p_tipo TEXT DEFAULT 'JURIDICA',
  p_papel TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_id BIGINT;
  v_cnpj TEXT;
BEGIN
  v_cnpj := public.only_digits(p_cnpj);
  IF v_cnpj IS NULL OR v_cnpj = '' THEN
    RETURN NULL;
  END IF;

  -- tenta localizar por documento (só-dígitos)
  SELECT e.id INTO v_id
  FROM public.entidades e
  WHERE public.only_digits(e.documento) = v_cnpj
  LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.entidades (nome, tipo_pessoa, documento, ativo)
    VALUES (coalesce(p_nome,'Entidade'), coalesce(p_tipo,'JURIDICA'), v_cnpj, true)
    RETURNING id INTO v_id;
  END IF;

  -- aplica papel se houver infra-estrutura de papéis
  IF p_papel IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='papeis')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='entidade_papel') THEN
      -- cria o papel se não existir
      INSERT INTO public.papeis(nome)
      SELECT p_papel
      WHERE NOT EXISTS (SELECT 1 FROM public.papeis WHERE nome = p_papel);

      -- associa se não existir
      INSERT INTO public.entidade_papel(entidade, papel)
      SELECT v_id, p.id
      FROM public.papeis p
      WHERE p.nome = p_papel
        AND NOT EXISTS (
          SELECT 1 FROM public.entidade_papel ep WHERE ep.entidade = v_id AND ep.papel = p.id
        );
    END IF;
  END IF;

  RETURN v_id;
END
$$;

-- 4) fn_conciliar_nfe: usa os CNPJs para garantir fornecedor e entidade
DROP FUNCTION IF EXISTS public.fn_conciliar_nfe(TEXT, BIGINT, BOOLEAN);

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
  v_fornecedor_id BIGINT;
  v_entidade_id   BIGINT;
BEGIN
  -- NFe
  SELECT n.* INTO v_nfe FROM public.nfe_data n WHERE n.chave_acesso = p_chave;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NFe não encontrada: '||COALESCE(p_chave,'<null>'), NULL::BIGINT;
    RETURN;
  END IF;

  -- garante fornecedor (emitente) e entidade (destinatário)
  v_fornecedor_id := public.ensure_entidade_by_cnpj(v_nfe.cnpj_emitente,      v_nfe.emitente,      'JURIDICA', 'FORNECEDOR');
  v_entidade_id   := public.ensure_entidade_by_cnpj(v_nfe.cnpj_destinatario,  v_nfe.destinatario,  'JURIDICA', 'CLIENTE');

  -- checa tabelas alvo
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contas_pagar_corporativas') INTO v_has_contas;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='parcelas_conta_pagar')       INTO v_has_parcelas;

  IF NOT v_has_contas OR NOT v_has_parcelas THEN
    RETURN QUERY SELECT false, 'Tabelas de contas/parcelas não existem neste schema.', NULL::BIGINT;
    RETURN;
  END IF;

  -- criar conta automática (se pedido e não veio conta)
  IF p_criar_conta IS TRUE AND (p_conta_id IS NULL OR p_conta_id = 0) THEN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='contas_pagar_corporativas' AND column_name='categoria_id'
    ) INTO v_has_categoria_col;

    BEGIN
      IF v_has_categoria_col THEN
        INSERT INTO public.contas_pagar_corporativas
          (filial_id, credor_id, descricao, valor_total, categoria_id, dt_vencimento, status)
        VALUES
          (v_entidade_id, v_fornecedor_id, CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')), v_nfe.valor_total, NULL, v_nfe.data_emissao, 'aberta')
        RETURNING id INTO v_conta_id;
      ELSE
        INSERT INTO public.contas_pagar_corporativas
          (filial_id, credor_id, descricao, valor_total, dt_vencimento, status)
        VALUES
          (v_entidade_id, v_fornecedor_id, CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')), v_nfe.valor_total, v_nfe.data_emissao, 'aberta')
        RETURNING id INTO v_conta_id;
      END IF;

      IF v_nfe.valor_total IS NOT NULL THEN
        INSERT INTO public.parcelas_conta_pagar
          (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
        VALUES
          (v_conta_id, 1, v_nfe.data_emissao, v_nfe.valor_total, 'a_vencer');
      END IF;

      v_msg := 'Conta criada (credor=fornecedor, filial=entidade) e parcela gerada; ';
    EXCEPTION WHEN others THEN
      RETURN QUERY SELECT false, 'Não foi possível criar conta automaticamente (NOT NULL/estrutura). Informe uma conta existente.', NULL::BIGINT;
      RETURN;
    END;
  ELSE
    v_conta_id := p_conta_id;
  END IF;

  -- vincula parcelas da conta
  IF v_conta_id IS NOT NULL AND v_conta_id <> 0 THEN
    INSERT INTO public.nfe_parcela_link (chave_acesso, parcela_id)
    SELECT p_chave, p.id
    FROM public.parcelas_conta_pagar p
    WHERE p.conta_pagar_id = v_conta_id
    ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;

    RETURN QUERY SELECT true, COALESCE(v_msg,'')||'Vinculada à conta #'||v_conta_id, v_conta_id;
  END IF;

  RETURN QUERY SELECT false, 'Nenhuma conta informada e não foi possível criar automaticamente.', NULL::BIGINT;
END $$;

COMMIT;
