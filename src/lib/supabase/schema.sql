-- ==============================================================================
-- SCHEMA SUPABASE POSTGRESQL & RLS POLICIES PARA CONTABILIDADE & CONVERSAS
-- ==============================================================================

-- ==================== EXTENSÃO PARA UUID ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS profiles (
  uid        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT NOT NULL,
  nome_lower TEXT NOT NULL GENERATED ALWAYS AS (LOWER(nome)) STORED,
  email      TEXT UNIQUE NOT NULL,
  foto_url   TEXT,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para pesquisa ILIKE
CREATE INDEX IF NOT EXISTS idx_profiles_nome_lower ON profiles (nome_lower);

-- ==================== FRIEND REQUESTS ====================
CREATE TABLE IF NOT EXISTS friend_requests (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_uid   UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  to_uid     UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  status     TEXT NOT NULL CHECK (status IN ('pendente', 'aceito', 'recusado')) DEFAULT 'pendente',
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_uid, to_uid)
);

-- ==================== FRIENDSHIPS ====================
CREATE TABLE IF NOT EXISTS friendships (
  member_a   UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  member_b   UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_a, member_b),
  CHECK (member_a < member_b)  -- evita duplicados invertidos
);

-- ==================== CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  members          UUID[] NOT NULL,
  eh_grupo         BOOLEAN NOT NULL DEFAULT false,
  nome             TEXT,
  foto_url         TEXT,
  admins           UUID[] DEFAULT '{}',
  ultima_mensagem  TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice GIN para pesquisar conversas por membro
CREATE INDEX IF NOT EXISTS idx_conversations_members ON conversations USING GIN (members);

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tipo           TEXT NOT NULL CHECK (tipo IN ('texto', 'arquivo')),
  sender_id      UUID NOT NULL REFERENCES profiles(uid) ON DELETE CASCADE,
  texto          TEXT,
  arquivo_url    TEXT,
  arquivo_nome   TEXT,
  arquivo_tipo   TEXT,
  arquivo_tamanho INTEGER,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversa ON messages (conversation_id, criado_em);

-- ==================== FUNÇÃO AUXILIAR ====================
CREATE OR REPLACE FUNCTION atualizar_conversa()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET atualizado_em = now(),
      ultima_mensagem = CASE
        WHEN NEW.tipo = 'texto' THEN NEW.texto
        ELSE '📎 ' || COALESCE(NEW.arquivo_nome, 'arquivo')
      END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_messages_atualizar_conversa ON messages;
CREATE TRIGGER trg_messages_atualizar_conversa
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION atualizar_conversa();

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_autenticado" ON profiles;
CREATE POLICY "profiles_select_autenticado"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "profiles_insert_proprio" ON profiles;
CREATE POLICY "profiles_insert_proprio"
  ON profiles FOR INSERT
  WITH CHECK (uid = auth.uid());

DROP POLICY IF EXISTS "profiles_update_proprio" ON profiles;
CREATE POLICY "profiles_update_proprio"
  ON profiles FOR UPDATE
  USING (uid = auth.uid());

-- FRIEND REQUESTS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_requests_select" ON friend_requests;
CREATE POLICY "friend_requests_select"
  ON friend_requests FOR SELECT
  USING (from_uid = auth.uid() OR to_uid = auth.uid());

DROP POLICY IF EXISTS "friend_requests_insert" ON friend_requests;
CREATE POLICY "friend_requests_insert"
  ON friend_requests FOR INSERT
  WITH CHECK (from_uid = auth.uid());

DROP POLICY IF EXISTS "friend_requests_update" ON friend_requests;
CREATE POLICY "friend_requests_update"
  ON friend_requests FOR UPDATE
  USING (to_uid = auth.uid());

-- FRIENDSHIPS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_select" ON friendships;
CREATE POLICY "friendships_select"
  ON friendships FOR SELECT
  USING (member_a = auth.uid() OR member_b = auth.uid());

DROP POLICY IF EXISTS "friendships_insert" ON friendships;
CREATE POLICY "friendships_insert"
  ON friendships FOR INSERT
  WITH CHECK (member_a = auth.uid() OR member_b = auth.uid());

-- CONVERSATIONS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select"
  ON conversations FOR SELECT
  USING (auth.uid() = ANY (members));

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY (members));

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update"
  ON conversations FOR UPDATE
  USING (auth.uid() = ANY (members));

DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete"
  ON conversations FOR DELETE
  USING (auth.uid() = ANY (admins) AND eh_grupo = true);

-- MESSAGES
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY (conversations.members)
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND auth.uid() = ANY (conversations.members)
    )
  );

-- ==================== STORAGE BUCKETS & POLICIES ====================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('conversas', 'conversas', true) ON CONFLICT DO NOTHING;

--- SELECT (público autenticado)
-- CREATE POLICY "profile_photos_select"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'profile-photos' AND auth.role() = 'authenticated');

--- INSERT/UPDATE (apenas o dono)
-- CREATE POLICY "profile_photos_insert"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'profile-photos'
--   AND auth.uid() = (storage.foldername(name))[1]::uuid
-- );

--- SELECT (autenticado)
-- CREATE POLICY "conversas_select"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'conversas' AND auth.role() = 'authenticated');

--- INSERT (membro da conversa)
-- CREATE POLICY "conversas_insert"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'conversas'
--   AND EXISTS (
--     SELECT 1 FROM conversations
--     WHERE conversations.id::text = (storage.foldername(name))[1]
--     AND auth.uid() = ANY (conversations.members)
--   )
-- );
