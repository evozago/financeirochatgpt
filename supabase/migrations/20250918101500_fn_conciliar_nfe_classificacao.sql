-- Conciliação de NF-e com classificação automática
-- v1.0 - 2025-09-18

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_conciliar_nfe(
  p_chave TEXT,
  p_conta_id BIGINT,
  p_criar_conta BOOLEAN DEFAULT FALSE
) RETURNS TABLE(ok boolean, msg text, conta_id bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  v_nfe RECORD;
  v_fornecedor_id BIGINT;
  v_entidade_id BIGINT;
  v_conta BIGINT;
BEGIN
  -- carrega a NFe
  SELECT * INTO v_nfe FROM public.nfe_data WHERE chave_acesso = p_chave;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'NFe não encontrada: '||p_chave, NULL;
    RETURN;
  END IF;

  -- garante entidade do fornecedor
  v_fornecedor_id := public.ensure_entidade_auto(v_nfe.emitente, v_nfe.cnpj_emitente, 'JURIDICA');

  -- garante papel de fornecedor
  PERFORM public.ensure_papel(v_fornecedor_id, 'FORNECEDOR_REVENDA');

  -- garante entidade destinatário
  v_entidade_id := public.ensure_entidade_auto(v_nfe.destinatario, v_nfe.cnpj_destinatario, 'JURIDICA');
  PERFORM public.ensure_papel(v_entidade_id, 'CLIENTE');

  -- se criar conta
  IF p_criar_conta THEN
    INSERT INTO public.contas_pagar_corporativas(filial_id, credor_id, descricao, valor_total, dt_vencimento, status)
    VALUES (v_entidade_id, v_fornecedor_id, 'NFe '||COALESCE(v_nfe.numero,'-'), v_nfe.valor_total, v_nfe.data_emissao, 'aberta')
    RETURNING id INTO v_conta;

    RETURN QUERY SELECT true, 'Conta criada com sucesso', v_conta;
  ELSE
    RETURN QUERY SELECT true, 'Entidades e papéis vinculados (sem criar conta)', NULL;
  END IF;
END;
$$;

COMMIT;
