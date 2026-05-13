-- Adiciona a coluna rastreio na tabela solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS rastreio text;
