-- ============================================================
-- MIGRAÇÃO: Corrigir constraint de status em kit_historico
-- Execute este script COMPLETO no Supabase > SQL Editor > New Query
-- ============================================================

-- 1. Descobrir o nome exato da constraint atual (para diagnóstico)
SELECT conname AS constraint_name
FROM pg_constraint
WHERE conrelid = 'kit_historico'::regclass
  AND contype = 'c';

-- 2. Remover TODAS as check constraints da tabela automaticamente
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'kit_historico'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE 'ALTER TABLE kit_historico DROP CONSTRAINT ' || quote_ident(r.conname);
    RAISE NOTICE 'Removida constraint: %', r.conname;
  END LOOP;
END $$;

-- 3. Adicionar a nova constraint com os valores corretos
ALTER TABLE kit_historico
  ADD CONSTRAINT kit_historico_status_check
  CHECK (status IN ('pendente','em andamento','enviado','cancelado'));

-- 4. Migrar registros com status antigos
UPDATE kit_historico SET status = 'em andamento' WHERE status = 'em preparacao';
UPDATE kit_historico SET status = 'enviado'      WHERE status = 'entregue';

-- 5. Confirmar resultado
SELECT id, colab, status, created_at
FROM kit_historico
ORDER BY created_at DESC
LIMIT 20;
