-- ============================================================
-- NK3IT INVENTÁRIO DE TI — SCHEMA SUPABASE (PostgreSQL)
-- Execute este script no SQL Editor do Supabase
-- Dashboard > SQL Editor > New Query > Cole e clique em RUN
-- ============================================================

-- ─── EXTENSÃO UUID ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── LIMPAR TABELAS (caso re-executar) ───────────────────────
DROP TABLE IF EXISTS solicitacoes   CASCADE;
DROP TABLE IF EXISTS kit_historico  CASCADE;
DROP TABLE IF EXISTS kit_estoque    CASCADE;
DROP TABLE IF EXISTS historico      CASCADE;
DROP TABLE IF EXISTS ativo_fotos    CASCADE;
DROP TABLE IF EXISTS ativos         CASCADE;
DROP TABLE IF EXISTS colaboradores  CASCADE;
DROP TABLE IF EXISTS perfis         CASCADE;

-- ============================================================
-- 1. PERFIS DE USUÁRIO (vinculado ao Supabase Auth)
-- ============================================================
CREATE TABLE perfis (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  initials    TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: cria perfil automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfis (id, nome, role, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- 2. COLABORADORES
-- ============================================================
CREATE TABLE colaboradores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  email       TEXT DEFAULT '',
  dept        TEXT DEFAULT '',
  cargo       TEXT DEFAULT '',
  tel         TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. ATIVOS
-- ============================================================
CREATE TABLE ativos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  patrimonio  TEXT UNIQUE,
  marca       TEXT DEFAULT '',
  modelo      TEXT DEFAULT '',
  serie       TEXT DEFAULT '',
  tipo        TEXT DEFAULT 'Notebook',
  proc        TEXT DEFAULT '',
  ram         TEXT DEFAULT '',
  disco       TEXT DEFAULT '',
  so          TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'disponivel'
                CHECK (status IN ('disponivel','em uso','manutencao','estoque','descartado')),
  saude       TEXT NOT NULL DEFAULT 'bom'
                CHECK (saude IN ('bom','regular','ruim')),
  colab       TEXT DEFAULT '',           -- nome do colaborador (desnormalizado para velocidade)
  colab_id    UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  localizacao TEXT DEFAULT '',
  garantia    DATE,
  obs         TEXT DEFAULT '',
  emoji       TEXT DEFAULT '💻',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. FOTOS DOS ATIVOS
-- ============================================================
CREATE TABLE ativo_fotos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id    UUID NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  storage_path TEXT DEFAULT '',          -- path no Supabase Storage (opcional)
  ordem       INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. HISTÓRICO DE USO
-- ============================================================
CREATE TABLE historico (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ativo_id    UUID REFERENCES ativos(id) ON DELETE SET NULL,
  ativo_nome  TEXT NOT NULL DEFAULT '',
  colab       TEXT NOT NULL DEFAULT '',
  colab_id    UUID REFERENCES colaboradores(id) ON DELETE SET NULL,
  atribuido   TIMESTAMPTZ,
  devolvido   TIMESTAMPTZ,
  obs         TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. KIT ESTOQUE
-- ============================================================
CREATE TABLE kit_estoque (
  id          SERIAL PRIMARY KEY,
  item        TEXT UNIQUE NOT NULL,
  quantidade  INT NOT NULL DEFAULT 0
);

-- Dados iniciais do kit
INSERT INTO kit_estoque (item, quantidade) VALUES
  ('mochila',  0),
  ('squeeze',  0),
  ('caderno',  0),
  ('caneta',   0),
  ('mousepad', 0)
ON CONFLICT (item) DO NOTHING;

-- ============================================================
-- 7. HISTÓRICO DE KITS
-- ============================================================
CREATE TABLE kit_historico (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colab       TEXT NOT NULL DEFAULT '',
  qtd         INT NOT NULL DEFAULT 1,
  data_saida  DATE,
  obs         TEXT DEFAULT '',
  cancelado   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. SOLICITAÇÕES
-- ============================================================
CREATE TABLE solicitacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL DEFAULT 'maquina',
  colaborador TEXT NOT NULL DEFAULT '',
  cargo       TEXT DEFAULT '',
  dept        TEXT DEFAULT '',
  specs       TEXT DEFAULT '',
  prazo       DATE,
  prioridade  TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  obs         TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','em andamento','enviado','cancelado')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE perfis        ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ativos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ativo_fotos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_estoque   ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes  ENABLE ROW LEVEL SECURITY;

-- ── Helper: verificar se usuário é admin ──────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM perfis
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ── perfis ────────────────────────────────────────────────────
CREATE POLICY "Usuário vê próprio perfil"
  ON perfis FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin vê todos os perfis"
  ON perfis FOR SELECT
  USING (is_admin());

CREATE POLICY "Usuário atualiza próprio perfil"
  ON perfis FOR UPDATE
  USING (id = auth.uid());

-- ── colaboradores ─────────────────────────────────────────────
CREATE POLICY "Admin gerencia colaboradores"
  ON colaboradores FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê colaboradores"
  ON colaboradores FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── ativos ────────────────────────────────────────────────────
CREATE POLICY "Admin gerencia ativos"
  ON ativos FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê ativos"
  ON ativos FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── ativo_fotos ───────────────────────────────────────────────
CREATE POLICY "Admin gerencia fotos"
  ON ativo_fotos FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê fotos"
  ON ativo_fotos FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── historico ─────────────────────────────────────────────────
CREATE POLICY "Admin gerencia histórico"
  ON historico FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê histórico"
  ON historico FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── kit_estoque ───────────────────────────────────────────────
CREATE POLICY "Admin gerencia kit_estoque"
  ON kit_estoque FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê kit_estoque"
  ON kit_estoque FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── kit_historico ─────────────────────────────────────────────
CREATE POLICY "Admin gerencia kit_historico"
  ON kit_historico FOR ALL
  USING (is_admin());

CREATE POLICY "Client lê kit_historico"
  ON kit_historico FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── solicitações ──────────────────────────────────────────────
CREATE POLICY "Admin gerencia solicitações"
  ON solicitacoes FOR ALL
  USING (is_admin());

-- Clients podem criar e ver as próprias solicitações
CREATE POLICY "Client cria solicitação"
  ON solicitacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Client lê solicitações"
  ON solicitacoes FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================
CREATE INDEX idx_ativos_status     ON ativos(status);
CREATE INDEX idx_ativos_colab_id   ON ativos(colab_id);
CREATE INDEX idx_ativos_created    ON ativos(created_at DESC);
CREATE INDEX idx_historico_ativo   ON historico(ativo_id);
CREATE INDEX idx_historico_created ON historico(created_at DESC);
CREATE INDEX idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX idx_ativo_fotos_ativo ON ativo_fotos(ativo_id);

-- ============================================================
-- STORAGE BUCKET PARA FOTOS (execute separado se necessário)
-- ============================================================
-- No painel do Supabase: Storage > New Bucket
-- Nome: fotos-ativos | Public: SIM
--
-- Ou via SQL:
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('fotos-ativos', 'fotos-ativos', true)
-- ON CONFLICT DO NOTHING;

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
