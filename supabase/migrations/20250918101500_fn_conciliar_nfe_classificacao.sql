-- ================================================================
-- fn_conciliar_nfe: cria conta (se solicitado), gera parcelas
-- pelas duplicatas e classifica fornecedor/cliente + marcas
-- v1.1 - 2025-09-18
-- ================================================================

CREATE OR REPLACE FUNCTION public.fn_conciliar_nfe(
  p_chave      TEXT,
  p_conta_id   BIGINT,
  p_criar_conta BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (ok BOOLEAN, msg TEXT, conta_id BIGINT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nfe           RECORD;
  v_fornecedor_id BIGINT;
  v_entidade_id   BIGINT;
  v_conta_id      BIGINT;
  v_parcela_id    BIGINT;
  v_dup_count     INT;
  v_idx           INT;
BEGIN
  -- carrega nfe
  SELECT * INTO v_nfe FROM public.nfe_data WHERE chave_acesso = p_chave;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'NFe não encontrada: '||COALESCE(p_chave,'<null>'), NULL::BIGINT;
    RETURN;
  END IF;

  -- cria/garante fornecedor (emitente) e cliente (destinatário)
  SELECT e.id INTO v_fornecedor_id
  FROM public.entidades e
  WHERE public.only_digits(e.documento) = public.only_digits(v_nfe.cnpj_emitente)
  LIMIT 1;

  IF v_fornecedor_id IS NULL THEN
    INSERT INTO public.entidades (nome, tipo_pessoa, documento, ativo)
    VALUES (COALESCE(v_nfe.emitente,'Fornecedor'), 'JURIDICA', public.only_digits(v_nfe.cnpj_emitente), TRUE)
    RETURNING id INTO v_fornecedor_id;
  END IF;

  PERFORM public.ensure_papel(v_fornecedor_id, 'FORNECEDOR_REVENDA');

  SELECT e.id INTO v_entidade_id
  FROM public.entidades e
  WHERE public.only_digits(e.documento) = public.only_digits(v_nfe.cnpj_destinatario)
  LIMIT 1;

  IF v_entidade_id IS NULL THEN
    INSERT INTO public.entidades (nome, tipo_pessoa, documento, ativo)
    VALUES (COALESCE(v_nfe.destinatario,'Entidade'), 'JURIDICA', public.only_digits(v_nfe.cnpj_destinatario), TRUE)
    RETURNING id INTO v_entidade_id;
  END IF;

  PERFORM public.ensure_papel(v_entidade_id, 'CLIENTE');

  -- marca opcional de exemplo (ajuste conforme seu negócio)
  -- PERFORM public.attach_marca(v_fornecedor_id, 'Vestuário Feminino');

  -- decide conta alvo
  v_conta_id := p_conta_id;

  IF v_conta_id IS NULL OR v_conta_id = 0 THEN
    IF p_criar_conta IS TRUE THEN
      INSERT INTO public.contas_pagar_corporativas
        (filial_id, credor_id, descricao, valor_total, dt_vencimento, status)
      VALUES
        (v_entidade_id, v_fornecedor_id,
         CONCAT('NFe ', COALESCE(v_nfe.numero,'-'), '/', COALESCE(v_nfe.serie,'-')),
         v_nfe.valor_total, v_nfe.data_emissao, 'aberta')
      RETURNING id INTO v_conta_id;
    ELSE
      RETURN QUERY SELECT FALSE, 'Nenhuma conta informada e não foi possível criar automaticamente.', NULL::BIGINT;
      RETURN;
    END IF;
  END IF;

  -- gera parcelas a partir de nfe_duplicatas (se houver)
  SELECT COUNT(*) INTO v_dup_count
  FROM public.nfe_duplicatas d
  WHERE d.chave_acesso = p_chave;

  IF v_dup_count > 0 THEN
    FOR v_idx IN 1..v_dup_count LOOP
      WITH ord AS (
        SELECT row_number() OVER (ORDER BY data_venc, num_dup) AS rn,
               data_venc, valor
        FROM public.nfe_duplicatas
        WHERE chave_acesso = p_chave
      )
      INSERT INTO public.parcelas_conta_pagar
        (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
      SELECT v_conta_id, rn, data_venc, valor, 'a_vencer'
      FROM ord WHERE rn = v_idx
      RETURNING id INTO v_parcela_id;

      -- vincula cada parcela à chave
      IF v_parcela_id IS NOT NULL THEN
        INSERT INTO public.nfe_parcela_link (chave_acesso, parcela_id)
        VALUES (p_chave, v_parcela_id)
        ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;
      END IF;
    END LOOP;

  ELSE
    -- sem duplicatas: gera 1 parcela com o total
    INSERT INTO public.parcelas_conta_pagar
      (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
    VALUES
      (v_conta_id, 1, v_nfe.data_emissao, v_nfe.valor_total, 'a_vencer')
    RETURNING id INTO v_parcela_id;

    INSERT INTO public.nfe_parcela_link (chave_acesso, parcela_id)
    VALUES (p_chave, v_parcela_id)
    ON CONFLICT (chave_acesso, parcela_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT TRUE,
     'Conta criada (credor=fornecedor, filial=entidade) e parcela(s) gerada(s).',
      v_conta_id;
END $$;

-- tabela de duplicatas (se ainda não existir)
CREATE TABLE IF NOT EXISTS public.nfe_duplicatas (
  id            BIGSERIAL PRIMARY KEY,
  chave_acesso  TEXT NOT NULL REFERENCES public.nfe_data(chave_acesso) ON DELETE CASCADE,
  num_dup       TEXT NOT NULL,
  data_venc     DATE NOT NULL,
  valor         NUMERIC(14,2) NOT NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chave_acesso, num_dup, data_venc, valor)
);

CREATE INDEX IF NOT EXISTS idx_nfe_dup_chave ON public.nfe_duplicatas(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nfe_dup_venc  ON public.nfe_duplicatas(data_venc);
