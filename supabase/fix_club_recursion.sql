-- Script para corrigir recursão infinita nas políticas RLS
-- Execute este script APÓS executar clubes_setup.sql

-- 1. Atualizar funções para desabilitar RLS temporariamente
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

-- 2. Função para obter role de membro
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

-- 3. Recriar política de DELETE para membros
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
CREATE POLICY "Usuário pode sair do clube (se não for admin)"
  ON club_members FOR DELETE
  USING (
    auth.uid() = user_id
    AND get_member_role(id) != 'admin'
  );

