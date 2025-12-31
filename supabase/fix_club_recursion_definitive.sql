-- SOLUÇÃO DEFINITIVA PARA RECURSÃO INFINITA
-- Execute este script para corrigir TODOS os problemas de recursão

-- 1. Remover TODAS as políticas problemáticas de club_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- 2. Criar políticas SIMPLES que não causam recursão
-- Política de SELECT: Qualquer usuário autenticado pode ver membros
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de INSERT: Qualquer usuário pode entrar (verificação será feita no código)
CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Usuário pode deletar sua própria entrada
-- NÃO verificar role aqui para evitar recursão - a verificação será no código
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Política de UPDATE: Usar função que não causa recursão
CREATE POLICY "Admin pode atualizar membros"
  ON club_members FOR UPDATE
  USING (is_club_admin(club_id, auth.uid()));

-- 3. Garantir que todas as funções desabilitam RLS corretamente
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Forçar desabilitar RLS
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
  -- Forçar desabilitar RLS
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

-- 4. Funções RPC para operações críticas (bypassam RLS completamente)
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID AS $$
DECLARE
  member_id UUID;
BEGIN
  -- Desabilitar RLS completamente
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

CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- Desabilitar RLS completamente
  PERFORM set_config('row_security', 'off', true);
  
  RETURN QUERY
  SELECT cm.id, cm.role::VARCHAR, cm.joined_at
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
  -- Desabilitar RLS completamente
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

-- 5. Função para deletar membro (com verificação de admin)
CREATE OR REPLACE FUNCTION delete_club_member(p_club_id UUID, p_user_id UUID, p_member_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin BOOLEAN;
  member_role VARCHAR;
BEGIN
  -- Desabilitar RLS
  PERFORM set_config('row_security', 'off', true);
  
  -- Verificar se quem está deletando é admin
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
    AND user_id = p_user_id
    AND role = 'admin'
  ) INTO is_admin;
  
  -- Se não for admin, só pode deletar a si mesmo
  IF NOT is_admin AND p_member_user_id != p_user_id THEN
    RETURN false;
  END IF;
  
  -- Verificar se o membro a ser deletado é admin
  SELECT role INTO member_role
  FROM club_members
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  -- Admin não pode ser deletado (exceto por transferência de liderança)
  IF member_role = 'admin' THEN
    RETURN false;
  END IF;
  
  -- Deletar membro
  DELETE FROM club_members 
  WHERE club_id = p_club_id
  AND user_id = p_member_user_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

