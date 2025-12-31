-- ============================================
-- RESET COMPLETO DO SISTEMA DE CLUBES
-- Este script remove TUDO e recria do zero
-- Execute com cuidado - apaga todos os dados de clubes!
-- ============================================

-- ============================================
-- PARTE 1: REMOVER TUDO (em ordem reversa de dependências)
-- ============================================

-- Remover triggers
DROP TRIGGER IF EXISTS on_club_created ON clubes;
DROP TRIGGER IF EXISTS update_clubes_updated_at ON clubes;

-- Remover funções
DROP FUNCTION IF EXISTS create_club_admin() CASCADE;
DROP FUNCTION IF EXISTS update_club_updated_at() CASCADE;
DROP FUNCTION IF EXISTS is_club_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS is_club_admin(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_member_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS insert_club_member(UUID, UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_club_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_club_members_list(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_club_member(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS delete_club_member(UUID, UUID, UUID) CASCADE;

-- Remover TODAS as políticas RLS
-- club_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- clubes
DROP POLICY IF EXISTS "Qualquer um pode ver clubes públicos" ON clubes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar clubes" ON clubes;
DROP POLICY IF EXISTS "Apenas admin pode atualizar clube" ON clubes;
DROP POLICY IF EXISTS "Apenas admin pode deletar clube" ON clubes;

-- club_posts
DROP POLICY IF EXISTS "Membros podem ver posts do clube" ON club_posts;
DROP POLICY IF EXISTS "Membros podem criar posts" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;

-- club_post_likes
DROP POLICY IF EXISTS "Membros podem ver likes" ON club_post_likes;
DROP POLICY IF EXISTS "Membros podem dar like" ON club_post_likes;

-- club_post_comments
DROP POLICY IF EXISTS "Membros podem ver comentários" ON club_post_comments;
DROP POLICY IF EXISTS "Membros podem comentar" ON club_post_comments;

-- club_messages
DROP POLICY IF EXISTS "Membros podem ver mensagens" ON club_messages;
DROP POLICY IF EXISTS "Membros podem enviar mensagens" ON club_messages;

-- Desabilitar RLS temporariamente
ALTER TABLE club_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE clubes DISABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: DELETAR TODOS OS DADOS (OPCIONAL - descomente se quiser limpar)
-- ============================================

-- ATENÇÃO: Descomente as linhas abaixo se quiser APAGAR todos os dados
-- DELETE FROM club_post_comments;
-- DELETE FROM club_post_likes;
-- DELETE FROM club_posts;
-- DELETE FROM club_messages;
-- DELETE FROM club_members;
-- DELETE FROM clubes;

-- ============================================
-- PARTE 3: RECRIAR FUNÇÕES SECURITY DEFINER (sem recursão)
-- ============================================

-- Função para verificar se é membro (SECURITY DEFINER bypassa RLS)
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para verificar se é admin (SECURITY DEFINER bypassa RLS)
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para inserir membro (RPC)
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID AS $$
DECLARE
  member_id UUID;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para buscar membro (RPC)
CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  RETURN QUERY
  SELECT cm.id, cm.role::VARCHAR, cm.joined_at
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  AND cm.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para listar membros (RPC)
CREATE OR REPLACE FUNCTION get_club_members_list(p_club_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para atualizar membro (RPC)
CREATE OR REPLACE FUNCTION update_club_member(p_member_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_club_id UUID;
  is_admin BOOLEAN;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para deletar membro (RPC)
CREATE OR REPLACE FUNCTION delete_club_member(p_club_id UUID, p_user_id UUID, p_member_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  member_role VARCHAR;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_club_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_clubes_updated_at ON clubes;
CREATE TRIGGER update_clubes_updated_at
  BEFORE UPDATE ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION update_club_updated_at();

-- Função para criar admin automaticamente (trigger)
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
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

-- Trigger para criar admin
DROP TRIGGER IF EXISTS on_club_created ON clubes;
CREATE TRIGGER on_club_created
  AFTER INSERT ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION create_club_admin();

-- ============================================
-- PARTE 4: RECRIAR POLÍTICAS RLS (SIMPLES, sem recursão)
-- ============================================

-- Habilitar RLS
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para clubes
CREATE POLICY "Qualquer um pode ver clubes públicos"
  ON clubes FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem criar clubes"
  ON clubes FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Apenas admin pode atualizar clube"
  ON clubes FOR UPDATE
  USING (is_club_admin(id, auth.uid()));

CREATE POLICY "Apenas admin pode deletar clube"
  ON clubes FOR DELETE
  USING (is_club_admin(id, auth.uid()));

-- Políticas para club_members (ULTRA SIMPLES - sem verificação de membro)
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- NÃO criar política de UPDATE - usar apenas RPC

-- Políticas para club_posts (usando funções, não queries diretas)
CREATE POLICY "Membros podem ver posts do clube"
  ON club_posts FOR SELECT
  USING (is_club_member(club_id, auth.uid()));

CREATE POLICY "Membros podem criar posts"
  ON club_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_club_member(club_id, auth.uid())
  );

CREATE POLICY "Autor ou admin pode atualizar post"
  ON club_posts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR is_club_admin(club_id, auth.uid())
  );

CREATE POLICY "Autor ou admin pode deletar post"
  ON club_posts FOR DELETE
  USING (
    auth.uid() = user_id
    OR is_club_admin(club_id, auth.uid())
  );

-- Políticas para club_post_likes
CREATE POLICY "Membros podem ver likes"
  ON club_post_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_likes.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

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

-- Políticas para club_post_comments
CREATE POLICY "Membros podem ver comentários"
  ON club_post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM club_posts cp
      WHERE cp.id = club_post_comments.post_id
      AND is_club_member(cp.club_id, auth.uid())
    )
  );

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

-- Políticas para club_messages
CREATE POLICY "Membros podem ver mensagens"
  ON club_messages FOR SELECT
  USING (is_club_member(club_id, auth.uid()));

CREATE POLICY "Membros podem enviar mensagens"
  ON club_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND is_club_member(club_id, auth.uid())
  );

