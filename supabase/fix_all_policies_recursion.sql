-- CORREÇÃO COMPLETA DE TODAS AS POLÍTICAS QUE CAUSAM RECURSÃO
-- Execute este script para corrigir TODAS as políticas que podem causar recursão

-- ============================================
-- PARTE 1: Corrigir políticas de club_members
-- ============================================

-- Remover TODAS as políticas de club_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- Criar políticas ULTRA SIMPLES (sem nenhuma verificação que acesse club_members)
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- NÃO criar política de UPDATE - todas as atualizações serão feitas via RPC

-- ============================================
-- PARTE 2: Corrigir funções que acessam club_members
-- ============================================

-- Função is_club_member com RLS desabilitado
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
  old_rls TEXT;
BEGIN
  -- Salvar estado atual do RLS
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  -- FORÇAR desabilitar RLS ANTES de qualquer query
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM club_members
      WHERE club_id = p_club_id
      AND user_id = p_user_id
    ) INTO result;
  EXCEPTION
    WHEN OTHERS THEN
      result := false;
  END;
  
  -- Restaurar RLS original
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função is_club_admin com RLS desabilitado
CREATE OR REPLACE FUNCTION is_club_admin(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
  old_rls TEXT;
BEGIN
  -- Salvar estado atual do RLS
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  -- FORÇAR desabilitar RLS ANTES de qualquer query
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM club_members
      WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND role = 'admin'
    ) INTO result;
  EXCEPTION
    WHEN OTHERS THEN
      result := false;
  END;
  
  -- Restaurar RLS original
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
  
  RETURN COALESCE(result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PARTE 3: Corrigir políticas de club_posts que têm queries diretas
-- ============================================

-- Remover políticas problemáticas de club_posts
DROP POLICY IF EXISTS "Autor ou admin pode atualizar/deletar post" ON club_posts;
DROP POLICY IF EXISTS "Autor ou admin pode deletar post" ON club_posts;

-- Recriar políticas SEM queries diretas a club_members
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
-- PARTE 4: Garantir que todas as funções RPC desabilitam RLS
-- ============================================

-- insert_club_member
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID AS $$
DECLARE
  member_id UUID;
  old_rls TEXT;
BEGIN
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    INSERT INTO club_members (club_id, user_id, role)
    VALUES (p_club_id, p_user_id, p_role)
    ON CONFLICT (club_id, user_id) DO UPDATE SET role = EXCLUDED.role
    RETURNING id INTO member_id;
  EXCEPTION
    WHEN OTHERS THEN
      member_id := NULL;
  END;
  
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
  
  RETURN member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- update_club_member
CREATE OR REPLACE FUNCTION update_club_member(p_member_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_club_id UUID;
  is_admin BOOLEAN;
  old_rls TEXT;
BEGIN
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    SELECT club_id INTO v_club_id
    FROM club_members
    WHERE id = p_member_id;
    
    IF v_club_id IS NULL THEN
      RETURN false;
    END IF;
    
    -- Verificar se quem está atualizando é admin (sem recursão)
    SELECT EXISTS (
      SELECT 1 FROM club_members
      WHERE club_id = v_club_id
      AND user_id = auth.uid()
      AND role = 'admin'
    ) INTO is_admin;
    
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
  
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_club_member
CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  old_rls TEXT;
BEGIN
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    RETURN QUERY
    SELECT cm.id, cm.role::VARCHAR, cm.joined_at
    FROM club_members cm
    WHERE cm.club_id = p_club_id
    AND cm.user_id = p_user_id
    LIMIT 1;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN;
  END;
  
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_club_members_list
CREATE OR REPLACE FUNCTION get_club_members_list(p_club_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  old_rls TEXT;
BEGIN
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  PERFORM set_config('row_security', 'off', true);
  
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
  EXCEPTION
    WHEN OTHERS THEN
      RETURN;
  END;
  
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- create_club_admin (trigger)
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
DECLARE
  old_rls TEXT;
BEGIN
  BEGIN
    old_rls := current_setting('row_security', true);
  EXCEPTION
    WHEN OTHERS THEN
      old_rls := NULL;
  END;
  
  PERFORM set_config('row_security', 'off', true);
  
  BEGIN
    INSERT INTO club_members (club_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'admin')
    ON CONFLICT (club_id, user_id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Erro ao criar membro admin: %', SQLERRM;
  END;
  
  IF old_rls IS NOT NULL THEN
    PERFORM set_config('row_security', old_rls, true);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

