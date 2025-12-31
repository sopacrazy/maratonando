-- Tabela de Clubes
CREATE TABLE IF NOT EXISTS clubes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1', -- Cor primária do clube (hex)
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Membros do Clube
CREATE TABLE IF NOT EXISTS club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'vice_leader', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(club_id, user_id),
  FOREIGN KEY (club_id) REFERENCES clubes(id) ON DELETE CASCADE
);

-- Tabela de Posts do Clube
CREATE TABLE IF NOT EXISTS club_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Likes em Posts do Clube
CREATE TABLE IF NOT EXISTS club_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Tabela de Comentários em Posts do Clube
CREATE TABLE IF NOT EXISTS club_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Mensagens do Chat do Clube
CREATE TABLE IF NOT EXISTS club_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_by JSONB DEFAULT '[]'::jsonb -- Array de user_ids que leram
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_club_id ON club_posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_user_id ON club_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_club_id ON club_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_club_messages_created_at ON club_messages(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário é membro (evita recursão em políticas RLS)
-- SECURITY DEFINER + SET LOCAL row_security = off para garantir que não há recursão
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Desabilitar RLS temporariamente dentro da função
  PERFORM set_config('row_security', 'off', true);
  
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
    AND user_id = p_user_id
  ) INTO result;
  
  RETURN COALESCE(result, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se usuário é admin (evita recursão em políticas RLS)
-- Deve ser criada ANTES das políticas que a utilizam
-- SECURITY DEFINER + SET LOCAL row_security = off para garantir que não há recursão
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Desabilitar RLS temporariamente dentro da função
  PERFORM set_config('row_security', 'off', true);
  
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
    AND user_id = p_user_id
    AND role = 'admin'
  ) INTO result;
  
  RETURN COALESCE(result, false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para clubes
DROP POLICY IF EXISTS "Qualquer um pode ver clubes públicos" ON clubes;
CREATE POLICY "Qualquer um pode ver clubes públicos"
  ON clubes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários autenticados podem criar clubes" ON clubes;
CREATE POLICY "Usuários autenticados podem criar clubes"
  ON clubes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Apenas admin pode atualizar clube" ON clubes;
CREATE POLICY "Apenas admin pode atualizar clube"
  ON clubes FOR UPDATE
  USING (is_club_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Apenas admin pode deletar clube" ON clubes;
CREATE POLICY "Apenas admin pode deletar clube"
  ON clubes FOR DELETE
  USING (is_club_admin(id, auth.uid()));

-- Políticas RLS para membros
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
-- Permitir que qualquer usuário autenticado veja os membros (evita recursão)
-- Se precisar restringir, use uma função SECURITY DEFINER
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Função para obter role de membro sem recursão
CREATE OR REPLACE FUNCTION get_member_role(p_member_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  member_role VARCHAR;
BEGIN
  -- Desabilitar RLS temporariamente
  PERFORM set_config('row_security', 'off', true);
  
  SELECT role INTO member_role FROM club_members WHERE id = p_member_id;
  
  RETURN member_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
-- Política simplificada: usuário pode deletar sua própria entrada
-- A verificação de admin será feita no código TypeScript
CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;
-- Política para admin atualizar membros (usa função SECURITY DEFINER para evitar recursão)
CREATE POLICY "Admin pode atualizar membros"
  ON club_members FOR UPDATE
  USING (is_club_admin(club_id, auth.uid()));

-- Políticas RLS para posts do clube
DROP POLICY IF EXISTS "Membros podem ver posts do clube" ON club_posts;
CREATE POLICY "Membros podem ver posts do clube"
  ON club_posts FOR SELECT
  USING (is_club_member(club_id, auth.uid()));

DROP POLICY IF EXISTS "Membros podem criar posts" ON club_posts;
CREATE POLICY "Membros podem criar posts"
  ON club_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_club_member(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
CREATE POLICY "Autor ou admin pode atualizar/deletar post"
  ON club_posts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (
      is_club_member(club_id, auth.uid())
      AND (
        is_club_admin(club_id, auth.uid())
        OR EXISTS (
          SELECT 1 FROM club_members
          WHERE club_id = club_posts.club_id
          AND user_id = auth.uid()
          AND role = 'moderator'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;
CREATE POLICY "Autor ou admin pode deletar post"
  ON club_posts FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_club_admin(club_id, auth.uid())
    OR (
      is_club_member(club_id, auth.uid())
      AND EXISTS (
        SELECT 1 FROM club_members
        WHERE club_id = club_posts.club_id
        AND user_id = auth.uid()
        AND role = 'moderator'
      )
    )
  );

-- Políticas RLS para likes
DROP POLICY IF EXISTS "Membros podem ver likes" ON club_post_likes;
CREATE POLICY "Membros podem ver likes"
  ON club_post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_likes.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Membros podem dar like" ON club_post_likes;
CREATE POLICY "Membros podem dar like"
  ON club_post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_likes.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

-- Políticas RLS para comentários
DROP POLICY IF EXISTS "Membros podem ver comentários" ON club_post_comments;
CREATE POLICY "Membros podem ver comentários"
  ON club_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_comments.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Membros podem comentar" ON club_post_comments;
CREATE POLICY "Membros podem comentar"
  ON club_post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_comments.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

-- Políticas RLS para mensagens do chat
DROP POLICY IF EXISTS "Membros podem ver mensagens" ON club_messages;
CREATE POLICY "Membros podem ver mensagens"
  ON club_messages FOR SELECT
  USING (is_club_member(club_id, auth.uid()));

DROP POLICY IF EXISTS "Membros podem enviar mensagens" ON club_messages;
CREATE POLICY "Membros podem enviar mensagens"
  ON club_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_club_member(club_id, auth.uid())
  );

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_club_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_clubes_updated_at ON clubes;
CREATE TRIGGER update_clubes_updated_at
  BEFORE UPDATE ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION update_club_updated_at();

-- Função para criar membro admin automaticamente ao criar clube
-- SECURITY DEFINER executa com privilégios do criador, bypassando RLS
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- SECURITY DEFINER já bypassa RLS, permitindo inserir diretamente
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (club_id, user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro, logar mas não falhar a criação do clube
    RAISE WARNING 'Erro ao criar membro admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se existir
DROP TRIGGER IF EXISTS on_club_created ON clubes;

CREATE TRIGGER on_club_created
  AFTER INSERT ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION create_club_admin();

