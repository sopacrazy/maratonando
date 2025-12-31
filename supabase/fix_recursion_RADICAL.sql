-- ============================================
-- SOLUÇÃO RADICAL: DESABILITAR RLS EM club_members
-- Mover toda lógica de permissão para o código TypeScript
-- ============================================

-- ============================================
-- PARTE 1: REMOVER TUDO
-- ============================================

-- Remover todas as políticas de club_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- Remover políticas de outras tabelas que usam is_club_member ou is_club_admin
DROP POLICY IF EXISTS "Membros podem ver posts do clube" ON club_posts;
DROP POLICY IF EXISTS "Membros podem criar posts" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;
DROP POLICY IF EXISTS "Membros podem ver likes" ON club_post_likes;
DROP POLICY IF EXISTS "Membros podem dar like" ON club_post_likes;
DROP POLICY IF EXISTS "Membros podem ver comentários" ON club_post_comments;
DROP POLICY IF EXISTS "Membros podem comentar" ON club_post_comments;
DROP POLICY IF EXISTS "Membros podem ver mensagens" ON club_messages;
DROP POLICY IF EXISTS "Membros podem enviar mensagens" ON club_messages;

-- ============================================
-- PARTE 2: DESABILITAR RLS COMPLETAMENTE EM club_members
-- ============================================

ALTER TABLE club_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 3: RECRIAR FUNÇÕES RPC (para uso no código TypeScript)
-- ============================================

-- Função para verificar se é membro (para uso no código, não em políticas)
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM club_members
    WHERE club_id = p_club_id
    AND user_id = p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se é admin (para uso no código, não em políticas)
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM club_members
    WHERE club_id = p_club_id
    AND user_id = p_user_id
    AND role = 'admin'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para inserir membro
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID AS $$
DECLARE
  member_id UUID;
BEGIN
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (p_club_id, p_user_id, p_role)
  ON CONFLICT (club_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING id INTO member_id;
  
  RETURN member_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar membro
CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.id, cm.role::VARCHAR, cm.joined_at
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  AND cm.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar membros
CREATE OR REPLACE FUNCTION get_club_members_list(p_club_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT cm.id, cm.user_id, cm.role::VARCHAR, cm.joined_at, cm.last_seen
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  ORDER BY 
    CASE cm.role
      WHEN 'admin' THEN 1
      WHEN 'vice_leader' THEN 2
      WHEN 'moderator' THEN 3
      ELSE 4
    END,
    cm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar membro
CREATE OR REPLACE FUNCTION update_club_member(p_member_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_club_id UUID;
  is_admin BOOLEAN;
BEGIN
  SELECT club_id INTO v_club_id
  FROM club_members
  WHERE id = p_member_id;
  
  IF v_club_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT is_club_admin(v_club_id, auth.uid()) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN false;
  END IF;
  
  UPDATE club_members
  SET role = p_new_role
  WHERE id = p_member_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para deletar membro
CREATE OR REPLACE FUNCTION delete_club_member(p_club_id UUID, p_user_id UUID, p_member_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  member_role VARCHAR;
BEGIN
  SELECT is_club_admin(p_club_id, p_user_id) INTO is_admin;
  
  IF NOT is_admin AND p_member_user_id != p_user_id THEN
    RETURN false;
  END IF;
  
  SELECT role INTO member_role
  FROM club_members
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  IF member_role = 'admin' THEN
    RETURN false;
  END IF;
  
  DELETE FROM club_members 
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para atualizar last_seen (RPC)
CREATE OR REPLACE FUNCTION update_club_member_last_seen(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE club_members
  SET last_seen = NOW()
  WHERE club_id = p_club_id
  AND user_id = p_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para criar admin automaticamente (trigger)
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (club_id, user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar membro admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_club_created ON clubes;
CREATE TRIGGER on_club_created
  AFTER INSERT ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION create_club_admin();

-- ============================================
-- PARTE 4: RECRIAR POLÍTICAS SIMPLES PARA OUTRAS TABELAS
-- (sem usar is_club_member ou is_club_admin nas políticas)
-- ============================================

-- Remover políticas existentes de clubes
DROP POLICY IF EXISTS "Qualquer um pode ver clubes públicos" ON clubes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clubes" ON clubes;
DROP POLICY IF EXISTS "Apenas admin pode atualizar clube" ON clubes;
DROP POLICY IF EXISTS "Apenas admin pode deletar clube" ON clubes;

-- Políticas para clubes (usar funções RPC)
CREATE POLICY "Qualquer um pode ver clubes públicos"
  ON clubes FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar clubes"
  ON clubes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Para UPDATE e DELETE de clubes, vamos usar apenas funções RPC no código
-- Não criar políticas aqui para evitar recursão

-- Remover políticas existentes de club_posts
DROP POLICY IF EXISTS "Usuários autenticados podem ver posts" ON club_posts;
DROP POLICY IF EXISTS "Membros podem ver posts do clube" ON club_posts;
DROP POLICY IF EXISTS "Usuários autenticados podem criar posts" ON club_posts;
DROP POLICY IF EXISTS "Membros podem criar posts" ON club_posts;
DROP POLICY IF EXISTS "Autor pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar post" ON club_posts;
DROP POLICY IF EXISTS "Autor pode deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;

-- Políticas para club_posts (SIMPLES - sem verificação de membro)
-- A verificação será feita no código TypeScript antes de inserir
CREATE POLICY "Usuários autenticados podem ver posts"
  ON club_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem criar posts"
  ON club_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Autor pode atualizar/deletar post"
  ON club_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Autor pode deletar post"
  ON club_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Remover políticas existentes de club_post_likes
DROP POLICY IF EXISTS "Usuários autenticados podem ver likes" ON club_post_likes;
DROP POLICY IF EXISTS "Membros podem ver likes" ON club_post_likes;
DROP POLICY IF EXISTS "Usuários autenticados podem dar like" ON club_post_likes;
DROP POLICY IF EXISTS "Membros podem dar like" ON club_post_likes;

-- Políticas para club_post_likes (SIMPLES)
CREATE POLICY "Usuários autenticados podem ver likes"
  ON club_post_likes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem dar like"
  ON club_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Remover políticas existentes de club_post_comments
DROP POLICY IF EXISTS "Usuários autenticados podem ver comentários" ON club_post_comments;
DROP POLICY IF EXISTS "Membros podem ver comentários" ON club_post_comments;
DROP POLICY IF EXISTS "Usuários autenticados podem comentar" ON club_post_comments;
DROP POLICY IF EXISTS "Membros podem comentar" ON club_post_comments;

-- Políticas para club_post_comments (SIMPLES)
CREATE POLICY "Usuários autenticados podem ver comentários"
  ON club_post_comments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem comentar"
  ON club_post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Remover políticas existentes de club_messages
DROP POLICY IF EXISTS "Usuários autenticados podem ver mensagens" ON club_messages;
DROP POLICY IF EXISTS "Membros podem ver mensagens" ON club_messages;
DROP POLICY IF EXISTS "Usuários autenticados podem enviar mensagens" ON club_messages;
DROP POLICY IF EXISTS "Membros podem enviar mensagens" ON club_messages;

-- Políticas para club_messages (SIMPLES)
CREATE POLICY "Usuários autenticados podem ver mensagens"
  ON club_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem enviar mensagens"
  ON club_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

