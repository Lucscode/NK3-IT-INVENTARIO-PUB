-- ============================================================
-- MIGRAÇÃO: Adicionar coluna `status` na tabela kit_historico
-- Execute este script no Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Adicionar coluna status (se não existir)
ALTER TABLE kit_historico
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendente'
  CHECK (status IN ('pendente','em preparacao','enviado','entregue'));

-- 2. Atualizar registros existentes não-cancelados para 'entregue'
--    (eles foram registrados manualmente pelo admin via "Registrar Saída",
--     então provavelmente já foram entregues fisicamente)
UPDATE kit_historico
SET status = 'entregue'
WHERE cancelado = FALSE AND status = 'pendente';

-- 3. Verificar resultado
SELECT id, colab, quantidade, cancelado, status, created_at
FROM kit_historico
ORDER BY created_at DESC
LIMIT 20;
