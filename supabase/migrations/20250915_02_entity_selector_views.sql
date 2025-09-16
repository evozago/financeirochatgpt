-- financeirolb: views canônicas para consumo no front/BI
-- v1.0 - 2025-09-15

BEGIN;

-- Pessoas físicas ativas
CREATE OR REPLACE VIEW public.vw_pessoas_unificadas AS
SELECT e.*
FROM public.entidades e
WHERE e.tipo_pessoa = 'FISICA' AND e.ativo = TRUE;

-- Empresas (PJ) ativas
CREATE OR REPLACE VIEW public.vw_empresas_unificadas AS
SELECT e.*
FROM public.entidades e
WHERE e.tipo_pessoa = 'JURIDICA' AND e.ativo = TRUE;

-- Dimensão de entidades com flags de papéis
CREATE OR REPLACE VIEW public.vw_dim_entidade AS
SELECT 
  e.id AS entidade_id,
  e.nome,
  e.tipo_pessoa,
  e.documento,
  e.email,
  e.telefone,
  e.ativo,
  EXISTS (SELECT 1 FROM public.entidade_papel ep WHERE ep.entidade_id = e.id AND ep.papel = 'FORNECEDOR') AS is_fornecedor,
  EXISTS (SELECT 1 FROM public.entidade_papel ep WHERE ep.entidade_id = e.id AND ep.papel = 'CLIENTE') AS is_cliente,
  EXISTS (SELECT 1 FROM public.entidade_papel ep WHERE ep.entidade_id = e.id AND ep.papel = 'FUNCIONARIO') AS is_funcionario,
  e.criado_em,
  e.atualizado_em
FROM public.entidades e;

-- Vendedores (funcionários) ativos
CREATE OR REPLACE VIEW public.vw_vendedores_unificados AS
SELECT e.*
FROM public.entidades e
WHERE EXISTS (
  SELECT 1 FROM public.entidade_papel ep 
  WHERE ep.entidade_id = e.id AND ep.papel = 'FUNCIONARIO'
) AND e.ativo = TRUE;

COMMIT;
