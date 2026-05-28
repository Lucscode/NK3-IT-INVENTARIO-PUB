-- Migração para adicionar o campo de rastreio na tabela kit_historico
ALTER TABLE public.kit_historico 
ADD COLUMN IF NOT EXISTS rastreio text;

-- Opcional: Atualizar os comentários da tabela para documentar o campo
COMMENT ON COLUMN public.kit_historico.rastreio IS 'Código de rastreio do envio do kit de boas-vindas';
