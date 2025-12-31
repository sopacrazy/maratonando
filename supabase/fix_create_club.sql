-- Script para corrigir a criação de clubes
-- Execute este script para garantir que não haverá erro 409 ao criar clubes

-- Atualizar função insert_club_member para usar DO UPDATE ao invés de DO NOTHING
-- Isso evita erro 409 quando o trigger já criou o membro
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

-- Garantir que o trigger create_club_admin também use ON CONFLICT DO NOTHING
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

