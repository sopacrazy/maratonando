-- ============================================
-- SOLUÇÃO DEFINITIVA PARA RECURSÃO INFINITA
-- Baseado na abordagem recomendada: usar funções SECURITY DEFINER
-- ============================================

-- ============================================
-- PARTE 1: Remover TODAS as políticas problemáticas
-- ============================================

DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- Remover políticas de club_posts que têm queries diretas
DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;

-- ============================================
-- PARTE 2: Criar funções SECURITY DEFINER (bypassam RLS)
-- ============================================

-- Função para verificar se usuário é membro do clube
-- SECURITY DEFINER = executa com permissões do criador, bypassa RLS
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER já bypassa RLS, mas vamos garantir desabilitando explicitamente
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

-- Função para verificar se usuário é admin do clube
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- SECURITY DEFINER já bypassa RLS
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

-- ============================================
-- PARTE 3: Criar políticas SIMPLES que NÃO acessam club_members diretamente
-- ============================================

-- Política de SELECT: Qualquer usuário autenticado pode ver
-- NÃO verifica se é membro para evitar recursão
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de INSERT: Qualquer usuário pode inserir
CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Usuário pode deletar sua própria entrada
-- NÃO verifica role para evitar recursão
CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- NÃO criar política de UPDATE
-- Todas as atualizações serão feitas via funções RPC

-- ============================================
-- PARTE 4: Corrigir políticas de club_posts para usar funções
-- ============================================

-- Remover políticas existentes primeiro
DROP POLICY IF EXISTS "Autor ou admin pode atualizar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;

-- Recriar políticas de club_posts SEM queries diretas a club_members
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

-- ============================================
-- PARTE 5: Funções RPC para operações críticas
-- ============================================

-- Inserir membro (bypassa RLS)
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

-- Atualizar membro (bypassa RLS)
CREATE OR REPLACE FUNCTION update_club_member(p_member_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_club_id UUID;
  is_admin BOOLEAN;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  -- Buscar club_id
  SELECT club_id INTO v_club_id
  FROM club_members
  WHERE id = p_member_id;
  
  IF v_club_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verificar se é admin (usando função, não query direta)
  SELECT is_club_admin(v_club_id, auth.uid()) INTO is_admin;
  
  IF NOT is_admin THEN
    RETURN false;
  END IF;
  
  -- Atualizar
  UPDATE club_members
  SET role = p_new_role
  WHERE id = p_member_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar membro (bypassa RLS)
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

-- Listar membros (bypassa RLS)
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

-- Deletar membro (bypassa RLS)
CREATE OR REPLACE FUNCTION delete_club_member(p_club_id UUID, p_user_id UUID, p_member_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  member_role VARCHAR;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  -- Verificar se quem está deletando é admin
  SELECT is_club_admin(p_club_id, p_user_id) INTO is_admin;
  
  -- Se não for admin, só pode deletar a si mesmo
  IF NOT is_admin AND p_member_user_id != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Verificar role do membro a ser deletado
  SELECT role INTO member_role
  FROM club_members
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  -- Admin não pode ser deletado
  IF member_role = 'admin' THEN
    RETURN false;
  END IF;
  
  -- Deletar
  DELETE FROM club_members 
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 6: Trigger para criar admin automaticamente
-- ============================================

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

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_club_created ON clubes;
CREATE TRIGGER on_club_created
  AFTER INSERT ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION create_club_admin();

