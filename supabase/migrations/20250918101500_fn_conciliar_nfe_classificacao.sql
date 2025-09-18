-- ======================================================================
-- fn_conciliar_nfe: cria/vincula conta, gera parcelas e classifica
--  - classifica fornecedor/destinatário com papéis
--  - usa duplicatas (nfe_duplicatas) quando houver para gerar parcelas
--  - idempotente
-- v1.1 - 2025-09-18
-- ======================================================================

BEGIN;

-- 1) Tabela de duplicatas da NFe (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.nfe_duplicatas (
  id           BIGSERIAL PRIMARY KEY,
  chave_acesso TEXT NOT NULL REFERENCES public.nfe_data(chave_acesso) ON DELETE CASCADE,
  num_dup      TEXT,
  data_venc    DATE NOT NULL,
  valor        NUMERIC(14,2) NOT NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (chave_acesso, num_dup, data_venc, valor)
);

CREATE INDEX IF NOT EXISTS idx_nfe_dup_chave ON public.nfe_duplicatas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_dup_venc  ON public.nfe_duplicatas(data_venc);

-- 2) (Re)cria função de conciliação
CREATE OR REPLACE FUNCTION public.fn_conciliar_nfe(
  p_chave      TEXT,
  p_conta_id   BIGINT,
  p_criar_conta BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(ok boolean, msg text, conta_id bigint)
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_nfe            RECORD;
  v_msg            TEXT := '';
  v_conta          BIGINT;
  v_emitente_id    BIGINT;
  v_destinatario_id BIGINT;
  v_has_contas     BOOLEAN;
  v_has_parcelas   BOOLEAN;
  v_cnt            INT;
  r_dup            RECORD;
  v_parcela_id     BIGINT;
BEGIN
  -- carrega a NFe
  SELECT *
    INTO v_nfe
  FROM public.nfe_data n
  WHERE n.chave_acesso = p_chave;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NFe não encontrada: '||COALESCE(p_chave,'<null>'), NULL::BIGINT;
    RETURN;
  END IF;

  -- tabelas alvo existem?
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

  -- cria/garante entidades por CNPJ (helpers devem existir no banco)
  -- fornecedor (emitente)
  SELECT public.ensure_entidade_auto(
           COALESCE(v_nfe.emitente,'Emitente'),
           'JURIDICA',
           public.only_digits(v_nfe.cnpj_emitente),
           NULL
         ) INTO v_emitente_id;

  PERFORM public.ensure_papel(v_emitente_id, 'FORNECEDOR_REVENDA');

  -- destinatário (minha filial/empresa)
  SELECT public.ensure_entidade_auto(
           COALESCE(v_nfe.destinatario,'Destinatário'),
           'JURIDICA',
           public.only_digits(v_nfe.cnpj_destinatario),
           NULL
         ) INTO v_destinatario_id;

  -- marca automaticamente como CLIENTE (ajuste se desejar regra diferente)
  PERFORM public.ensure_papel(v_destinatario_id, 'CLIENTE');

  -- cria conta automaticamente quando solicitado
  IF (p_conta_id IS NULL OR p_conta_id = 0) AND p_criar_conta THEN
    INSERT INTO public.contas_pagar_corporativas
      (filial_id,  credor_id,  descricao,
       valor_total,             dt_vencimento, status)
    VALUES
      (v_destinatario_id, v_emitente_id,
       CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')),
       v_nfe.valor_total, v_nfe.data_emissao, 'aberta')
    RETURNING id INTO v_conta;

    v_msg := 'Conta criada (credor=fornecedor, filial=entidade). ';
  ELSE
    v_conta := p_conta_id;
  END IF;

  -- se houver conta, gera parcelas
  IF v_conta IS NULL OR v_conta = 0 THEN
    RETURN QUERY SELECT false, 'Nenhuma conta informada e não foi possível criar automaticamente.', NULL::BIGINT;
    RETURN;
  END IF;

  -- usa duplicatas, se existirem; caso contrário, 1 parcela do valor total
  SELECT COUNT(*) INTO v_cnt
  FROM public.nfe_duplicatas d
  WHERE d.chave_acesso = p_chave;

  IF v_cnt > 0 THEN
    FOR r_dup IN
      SELECT *
      FROM public.nfe_duplicatas d
      WHERE d.chave_acesso = p_chave
      ORDER BY d.data_venc
    LOOP
      INSERT INTO public.parcelas_conta_pagar
        (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
      VALUES
        (v_conta,
         ROW_NUMBER() OVER (ORDER BY r_dup.data_venc), -- numeração 1..n no SELECT abaixo
         r_dup.data_venc,
         r_dup.valor,
         'a_vencer')
      RETURNING id INTO v_parcela_id;

      INSERT INTO public.nfe_parcela_link(chave_acesso, parcela_id)
      VALUES (p_chave, v_parcela_id)
      ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;
    END LOOP;
  ELSE
    INSERT INTO public.parcelas_conta_pagar
      (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
    VALUES
      (v_conta, 1, COALESCE(v_nfe.data_emissao, CURRENT_DATE), v_nfe.valor_total, 'a_vencer')
    RETURNING id INTO v_parcela_id;

    INSERT INTO public.nfe_parcela_link(chave_acesso, parcela_id)
    VALUES (p_chave, v_parcela_id)
    ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT true, COALESCE(v_msg,'')||'Parcelas geradas e vinculadas.', v_conta;
END
$fn$;

COMMIT;
