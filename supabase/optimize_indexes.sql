-- Otimização de Banco de Dados - Criação de Índices
-- Cria índices para chaves estrangeiras que não são chaves primárias
-- Isso acelera drasticamente joins e filtros por essas colunas

-- 1. Indexar buscas de Posts por Usuário (Perfil)
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);

-- 2. Indexar Likes por Post (Para contagem rápida e exibição)
-- O PK já cobre (user_id, post_id), mas precisamos buscar por post_id
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);

-- 3. Indexar Comentários por Post (Carregar comentários do feed)
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
-- E por usuário (se quisermos ver comentários de alguém)
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);

-- 4. Indexar Seguidores (Quem me segue?)
-- PK cobre (follower_id, following_id). Busca reversa (meus seguidores) precisa de índice
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- 5. Indexar Notificações (Minhas notificações)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- 6. Indexar Séries do Usuário (Carregar perfil do usuário)
CREATE INDEX IF NOT EXISTS idx_user_series_user_id ON public.user_series(user_id);

-- 7. Indexar busca de perfis por handle (User Search)
-- O campo 'id' é PK (indexado). 'handle' é UNIQUE (indexado). 
-- Mas busca por nome ('ilike') pode se beneficiar de um índice pg_trgm se tivermos a extensão,
-- mas para 'exact match' ou 'prefix' simples:
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(name);
