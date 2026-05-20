-- ============================================================
-- MIGRATION SCRIPT: Add new statuses to ativos table
-- ============================================================
-- This script adds the following statuses to the ativos table:
-- 'saindo para envio', 'entregue', 'nao postado ainda'
-- 
-- Run this script in your Supabase SQL Editor.

ALTER TABLE ativos DROP CONSTRAINT ativos_status_check;

ALTER TABLE ativos ADD CONSTRAINT ativos_status_check CHECK (status IN (
  'disponivel',
  'em uso',
  'manutencao',
  'estoque',
  'descartado',
  'quebrado',
  'saindo para envio',
  'entregue',
  'nao postado ainda'
));
