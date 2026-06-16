-- Migração para adicionar campos de telemetria na tabela ativos
ALTER TABLE public.ativos 
ADD COLUMN IF NOT EXISTS rmm_status text,
ADD COLUMN IF NOT EXISTS rmm_last_seen timestamp with time zone,
ADD COLUMN IF NOT EXISTS rmm_mem_percent text,
ADD COLUMN IF NOT EXISTS rmm_disk_percent text;

-- Comentários para documentação
COMMENT ON COLUMN public.ativos.rmm_status IS 'Status no Tactical RMM (ex: online, offline, overdue)';
COMMENT ON COLUMN public.ativos.rmm_last_seen IS 'Data/hora do último contato com o RMM';
COMMENT ON COLUMN public.ativos.rmm_mem_percent IS 'Porcentagem de uso da Memória RAM (ex: 85%)';
COMMENT ON COLUMN public.ativos.rmm_disk_percent IS 'Porcentagem de uso do Disco C: (ex: 60%)';
