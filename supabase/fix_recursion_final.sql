-- SOLUÇÃO FINAL PARA RECURSÃO INFINITA EM club_members
-- Execute este script para eliminar completamente a recursão

-- 1. Remover TODAS as políticas de club_members
DROP POLICY IF EXISTS "Membros podem ver outros membros" ON club_members;
DROP POLICY IF EXISTS "Qualquer um pode entrar no clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube" ON club_members;
DROP POLICY IF EXISTS "Usuário pode sair do clube (se não for admin)" ON club_members;
DROP POLICY IF EXISTS "Admin pode atualizar membros" ON club_members;

-- 2. Criar políticas ULTRA SIMPLES que NÃO acessam club_members
-- Política de SELECT: Qualquer usuário autenticado pode ver (sem verificação de membro)
CREATE POLICY "Membros podem ver outros membros"
  ON club_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Política de INSERT: Qualquer usuário pode inserir (sem verificação)
CREATE POLICY "Qualquer um pode entrar no clube"
  ON club_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política de DELETE: Usuário pode deletar sua própria entrada (sem verificação de role)
CREATE POLICY "Usuário pode sair do clube"
  ON club_members FOR DELETE
  USING (auth.uid() = user_id);

-- Política de UPDATE: REMOVIDA - usar apenas funções RPC para atualizar
-- Não criar política de UPDATE para evitar qualquer recursão

-- 3. Garantir que TODAS as funções desabilitam RLS explicitamente
CREATE OR REPLACE FUNCTION is_club_member(p_club_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- FORÇAR desabilitar RLS ANTES de qualquer query
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
  -- FORÇAR desabilitar RLS ANTES de qualquer query
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

-- 4. Atualizar função insert_club_member para garantir que funciona
CREATE OR REPLACE FUNCTION insert_club_member(p_club_id UUID, p_user_id UUID, p_role VARCHAR DEFAULT 'member')
RETURNS UUID AS $$
DECLARE
  member_id UUID;
BEGIN
  -- FORÇAR desabilitar RLS
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

-- 5. Função para atualizar membro (substitui política de UPDATE)
CREATE OR REPLACE FUNCTION update_club_member(p_member_id UUID, p_new_role VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_club_id UUID;
  v_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- FORÇAR desabilitar RLS
  PERFORM set_config('row_security', 'off', true);
  
  -- Buscar club_id e user_id do membro
  SELECT club_id, user_id INTO v_club_id, v_user_id
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
  
  -- Atualizar role
  UPDATE club_members
  SET role = p_new_role
  WHERE id = p_member_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Garantir que get_club_member também desabilita RLS
CREATE OR REPLACE FUNCTION get_club_member(p_club_id UUID, p_user_id UUID)
RETURNS TABLE(id UUID, role VARCHAR, joined_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  -- FORÇAR desabilitar RLS
  PERFORM set_config('row_security', 'off', true);
  
  RETURN QUERY
  SELECT cm.id, cm.role::VARCHAR, cm.joined_at
  FROM club_members cm
  WHERE cm.club_id = p_club_id
  AND cm.user_id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Garantir que get_club_members_list também desabilita RLS
CREATE OR REPLACE FUNCTION get_club_members_list(p_club_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role VARCHAR,
  joined_at TIMESTAMP WITH TIME ZONE,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- FORÇAR desabilitar RLS
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

-- 8. Garantir que o trigger create_club_admin também desabilita RLS
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- FORÇAR desabilitar RLS
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

