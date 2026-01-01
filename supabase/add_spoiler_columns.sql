-- Adicionar colunas de spoiler na tabela posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_spoiler boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS spoiler_topic text;

-- Comentários para documentação
COMMENT ON COLUMN public.posts.is_spoiler IS 'Indica se o post contém spoilers';
COMMENT ON COLUMN public.posts.spoiler_topic IS 'Tópico/série sobre a qual o spoiler se refere';









