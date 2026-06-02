-- ============================================================
-- Migration: Adicionar status "entregue" em solicitações
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole e clique em RUN
-- ============================================================

ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_status_check;

ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_status_check 
  CHECK (status IN ('pendente', 'em andamento', 'enviado', 'entregue', 'cancelado'));
