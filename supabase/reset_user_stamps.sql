-- Use este script para remover TODOS os selos ganhos por usuários (resetar conquistas)
-- CUIDADO: Isso apagará o histórico de conquistas de todos os usuários.

TRUNCATE TABLE public.user_stamps;

-- Se quiser apagar apenas de um usuário específico, use o comando abaixo (substitua o ID):
-- DELETE FROM public.user_stamps WHERE user_id = 'SEU_UUID_AQUI';

-- Se quiser apagar apenas um selo específico de um usuário:
-- DELETE FROM public.user_stamps WHERE user_id = 'SEU_UUID_AQUI' AND stamp_id = 'ID_DO_SELO';
