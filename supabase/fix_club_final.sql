-- Script FINAL para corrigir todos os problemas de recursão
-- Execute este script APÓS executar clubes_setup.sql

-- 1. Funções auxiliares que fazem operações diretamente, bypassando RLS
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR)
RETURNS UUID AS $$
DECLARE
  member_id UUID;
BEGIN
  -- Desabilitar RLS temporariamente
  PERFORM set_config('row_security', 'off', true);
  
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (p_club_id, p_user_id, p_role)
  ON CONFLICT (club_id, user_id) DO NOTHING
  RETURNING id INTO member_id;
  
  RETURN member_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- Desabilitar RLS temporariamente
  PERFORM set_config('row_security', 'off', true);
  
  RETURN QUERY
  SELECT cm.id, cm.role, cm.joined_at
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  AND cm.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_club_members_list(p_club_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Desabilitar RLS temporariamente
  PERFORM set_config('row_security', 'off', true);
  
  RETURN QUERY
  SELECT cm.id, cm.user_id, cm.role, cm.joined_at, cm.last_seen
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  ORDER BY cm.role, cm.joined_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar funções existentes para garantir que desabilitam RLS
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

-- 3. Simplificar política de SELECT para evitar qualquer recursão
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Garantir que política de INSERT é simples
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

