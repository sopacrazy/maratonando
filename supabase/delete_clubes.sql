-- ============================================
-- SCRIPT PARA EXCLUIR CLUBES DO BANCO DE DADOS
-- ============================================
-- ATENÇÃO: Esta ação é irreversível!
-- Devido ao CASCADE nas foreign keys, ao excluir um clube:
-- - Todos os membros serão excluídos automaticamente
-- - Todos os posts serão excluídos automaticamente
-- - Todas as mensagens serão excluídas automaticamente
-- - Todos os likes e comentários serão excluídos automaticamente

-- ============================================
-- 1. LISTAR TODOS OS CLUBES (Execute primeiro para ver os clubes)
-- ============================================
SELECT 
  id,
  name,
  description,
  color,
  created_by,
  created_at,
  (SELECT COUNT(*) FROM club_members WHERE club_id = clubes.id) as member_count,
  (SELECT COUNT(*) FROM club_posts WHERE club_id = clubes.id) as posts_count,
  (SELECT COUNT(*) FROM club_messages WHERE club_id = clubes.id) as messages_count
FROM clubes
ORDER BY created_at DESC;

-- ============================================
-- 2. EXCLUIR UM CLUBE ESPECÍFICO PELO ID
-- ============================================
-- Descomente a linha abaixo e substitua 'CLUB_ID_AQUI' pelo ID do clube
-- DELETE FROM clubes WHERE id = 'CLUB_ID_AQUI';

-- ============================================
-- 3. EXCLUIR UM CLUBE ESPECÍFICO PELO NOME
-- ============================================
-- Descomente a linha abaixo e substitua 'NOME_DO_CLUBE' pelo nome exato
-- DELETE FROM clubes WHERE name = 'NOME_DO_CLUBE';

-- ============================================
-- 4. EXCLUIR MÚLTIPLOS CLUBES POR NOME (usando LIKE)
-- ============================================
-- Exclui todos os clubes cujo nome contém "teste"
-- DELETE FROM clubes WHERE name LIKE '%teste%';

-- Exclui todos os clubes cujo nome começa com "as"
-- DELETE FROM clubes WHERE name LIKE 'as%';

-- ============================================
-- 5. EXCLUIR TODOS OS CLUBES (CUIDADO EXTREMO!)
-- ============================================
-- Descomente a linha abaixo para excluir TODOS os clubes
-- DELETE FROM clubes;

-- ============================================
-- 6. EXCLUIR CLUBES CRIADOS POR UM USUÁRIO ESPECÍFICO
-- ============================================
-- Descomente e substitua 'USER_ID_AQUI' pelo ID do usuário
-- DELETE FROM clubes WHERE created_by = 'USER_ID_AQUI';

-- ============================================
-- 7. EXCLUIR CLUBES SEM MEMBROS (exceto o admin criador)
-- ============================================
-- Exclui clubes que não têm nenhum membro além do criador
-- DELETE FROM clubes 
-- WHERE id NOT IN (
--   SELECT DISTINCT club_id FROM club_members
--   WHERE role != 'admin' OR user_id != created_by
-- );

-- ============================================
-- 8. EXCLUIR CLUBES DE TESTE (nome contém "teste" ou "asas")
-- ============================================
-- DELETE FROM clubes 
-- WHERE LOWER(name) LIKE '%teste%' 
--    OR LOWER(name) LIKE '%asas%'
--    OR LOWER(name) LIKE '%asaaaa%';

-- ============================================
-- 9. VERIFICAR ANTES DE EXCLUIR (mostra o que será excluído)
-- ============================================
-- Execute esta query antes de excluir para ver o que será afetado:
-- SELECT 
--   c.id,
--   c.name,
--   (SELECT COUNT(*) FROM club_members WHERE club_id = c.id) as membros,
--   (SELECT COUNT(*) FROM club_posts WHERE club_id = c.id) as posts,
--   (SELECT COUNT(*) FROM club_messages WHERE club_id = c.id) as mensagens
-- FROM clubes c
-- WHERE c.name LIKE '%teste%' OR c.name LIKE '%asas%';

