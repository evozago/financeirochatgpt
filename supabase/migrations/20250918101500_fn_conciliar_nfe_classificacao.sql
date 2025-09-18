-- ============================================================
-- Função fn_conciliar_nfe atualizada
-- Gera parcelas pelas duplicatas + classifica fornecedor/cliente
-- v1.1 - 2025-09-18
-- ============================================================

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
  v_conta_id BIGINT;
  v_msg TEXT := '';
  v_fornecedor_id BIGINT;
  v_entidade_id BIGINT;
  v_parcela_id BIGINT;
  v_dup RECORD;
BEGIN
  -- 1. Carrega a NFe
  SELECT * INTO v_nfe FROM public.nfe_data WHERE chave_acesso = p_chave;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NFe não encontrada: '||COALESCE(p_chave,'<null>'), NULL::BIGINT;
    RETURN;
  END IF;

  -- 2. Localiza/garante fornecedor e destinatário (entidades)
  SELECT id INTO v_fornecedor_id FROM public.entidades e
    WHERE e.documento = v_nfe.cnpj_emitente LIMIT 1;
  IF v_fornecedor_id IS NULL THEN
    INSERT INTO public.entidades(nome,tipo_pessoa,documento,ativo)
    VALUES (COALESCE(v_nfe.emitente,'Emitente'), 'JURIDICA', v_nfe.cnpj_emitente, true)
    RETURNING id INTO v_fornecedor_id;
  END IF;

  SELECT id INTO v_entidade_id FROM public.entidades e
    WHERE e.documento = v_nfe.cnpj_destinatario LIMIT 1;
  IF v_entidade_id IS NULL THEN
    INSERT INTO public.entidades(nome,tipo_pessoa,documento,ativo)
    VALUES (COALESCE(v_nfe.destinatario,'Destinatário'), 'JURIDICA', v_nfe.cnpj_destinatario, true)
    RETURNING id INTO v_entidade_id;
  END IF;

  -- 3. Classifica papéis básicos
  PERFORM public.ensure_papel(v_fornecedor_id, 'FORNECEDOR_REVENDA'); -- ou CONSUMO
  PERFORM public.ensure_papel(v_entidade_id,   'CLIENTE');

  -- 4. Se necessário, cria conta
  IF p_criar_conta IS TRUE AND (p_conta_id IS NULL OR p_conta_id = 0) THEN
    INSERT INTO public.contas_pagar_corporativas
      (filial_id, credor_id, descricao, valor_total, dt_vencimento, status)
    VALUES
      (v_entidade_id, v_fornecedor_id,
       CONCAT('NFe ', v_nfe.numero,'/',v_nfe.serie),
       v_nfe.valor_total,
       v_nfe.data_emissao,
       'aberta')
    RETURNING id INTO v_conta_id;

    v_msg := 'Conta criada automaticamente; ';
  ELSE
    v_conta_id := p_conta_id;
  END IF;

  -- 5. Gera parcelas conforme duplicatas
  FOR v_dup IN
    SELECT * FROM public.nfe_duplicatas d WHERE d.chave_acesso = p_chave ORDER BY data_venc
  LOOP
    INSERT INTO public.parcelas_conta_pagar (conta_pagar_id, num_parcela, data_vencimento, valor_parcela, status)
    VALUES (v_conta_id, v_dup.num_dup::INT, v_dup.data_venc, v_dup.valor, 'a_vencer')
    RETURNING id INTO v_parcela_id;

    INSERT INTO public.nfe_parcela_link (chave_acesso, parcela_id)
    VALUES (p_chave, v_parcela_id)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- 6. Retorna sucesso
  RETURN QUERY SELECT true, COALESCE(v_msg,'')||'Conciliação concluída', v_conta_id;

END$$;
