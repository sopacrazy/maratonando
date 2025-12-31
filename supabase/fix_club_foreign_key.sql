-- Script para corrigir foreign key e trigger de clubes
-- Execute este script se tiver problemas com a criação de clubes

-- 1. Remover constraint antiga se existir
ALTER TABLE IF EXISTS club_members DROP CONSTRAINT IF EXISTS club_members_club_id_fkey;

-- 2. Adicionar constraint corretamente
ALTER TABLE club_members 
ADD CONSTRAINT club_members_club_id_fkey 
FOREIGN KEY (club_id) REFERENCES clubes(id) ON DELETE CASCADE;

-- 3. Atualizar função do trigger para lidar com erros
CREATE OR REPLACE FUNCTION create_club_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir membro admin após a transação do clube ser commitada
  INSERT INTO club_members (club_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin')
  ON CONFLICT (club_id, user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log do erro mas não falha a criação do clube
    RAISE WARNING 'Erro ao criar membro admin: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recriar trigger
DROP TRIGGER IF EXISTS on_club_created ON clubes;

CREATE TRIGGER on_club_created
  AFTER INSERT ON clubes
  FOR EACH ROW
  EXECUTE FUNCTION create_club_admin();
