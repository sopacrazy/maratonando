-- ============================================
-- TABELAS PARA BATALHAS DE OPINIÕES
-- ============================================

-- 1. Tabela de Batalhas de Opiniões
CREATE TABLE IF NOT EXISTS public.opinion_battles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) NOT NULL,
  topic text NOT NULL,
  description text NOT NULL,
  tmdb_id integer, -- ID da série relacionada (opcional mas recomendado)
  series_title text, -- Nome da série
  series_image text, -- URL da imagem da série
  duration_hours numeric(10, 4) NOT NULL DEFAULT 24, -- Duração em horas (máx 48, suporta decimais para testes)
  is_public boolean DEFAULT true, -- Se é público ou somente seguidores
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended')), -- Status da batalha
  winner_side text CHECK (winner_side IN ('agree', 'disagree')), -- Lado vencedor
  winner_comment_id uuid, -- ID do comentário vencedor
  ends_at timestamp with time zone NOT NULL, -- Quando a batalha termina
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para opinion_battles
ALTER TABLE public.opinion_battles ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para opinion_battles
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Todos podem ver batalhas públicas" ON public.opinion_battles;
DROP POLICY IF EXISTS "Usuários podem criar batalhas" ON public.opinion_battles;
DROP POLICY IF EXISTS "Usuários autenticados podem criar batalhas" ON public.opinion_battles;
DROP POLICY IF EXISTS "Criadores podem atualizar suas batalhas" ON public.opinion_battles;
DROP POLICY IF EXISTS "Criadores podem deletar suas batalhas" ON public.opinion_battles;

-- Criar políticas
CREATE POLICY "Todos podem ver batalhas públicas" 
  ON public.opinion_battles FOR SELECT 
  USING (
    is_public = true 
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.follows 
      WHERE follower_id = auth.uid() 
      AND following_id = opinion_battles.creator_id
    )
  );

CREATE POLICY "Usuários autenticados podem criar batalhas" 
  ON public.opinion_battles FOR INSERT 
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Criadores podem atualizar suas batalhas" 
  ON public.opinion_battles FOR UPDATE 
  USING (auth.uid() = creator_id);

CREATE POLICY "Criadores podem deletar suas batalhas" 
  ON public.opinion_battles FOR DELETE 
  USING (auth.uid() = creator_id);

-- 2. Tabela de Comentários/Argumentos das Batalhas
CREATE TABLE IF NOT EXISTS public.battle_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id uuid REFERENCES public.opinion_battles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  side text NOT NULL CHECK (side IN ('agree', 'disagree')), -- 'agree' = defender, 'disagree' = atacar
  content text NOT NULL,
  likes_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para battle_comments
ALTER TABLE public.battle_comments ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Todos podem ver comentários de batalhas públicas" ON public.battle_comments;
DROP POLICY IF EXISTS "Usuários autenticados podem criar comentários" ON public.battle_comments;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios comentários" ON public.battle_comments;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios comentários" ON public.battle_comments;

-- Políticas de acesso
CREATE POLICY "Todos podem ver comentários de batalhas públicas" 
  ON public.battle_comments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.opinion_battles 
      WHERE opinion_battles.id = battle_comments.battle_id
      AND (
        opinion_battles.is_public = true 
        OR opinion_battles.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.follows 
          WHERE follower_id = auth.uid() 
          AND following_id = opinion_battles.creator_id
        )
      )
    )
  );

CREATE POLICY "Usuários autenticados podem criar comentários" 
  ON public.battle_comments FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.opinion_battles 
      WHERE opinion_battles.id = battle_comments.battle_id
      AND opinion_battles.status = 'active'
      AND opinion_battles.ends_at > now()
    )
  );

CREATE POLICY "Usuários podem atualizar seus próprios comentários" 
  ON public.battle_comments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios comentários" 
  ON public.battle_comments FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Tabela de Curtidas nos Comentários das Batalhas
CREATE TABLE IF NOT EXISTS public.battle_comment_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid REFERENCES public.battle_comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id) -- Um usuário só pode curtir uma vez cada comentário
);

-- RLS para battle_comment_likes
ALTER TABLE public.battle_comment_likes ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Todos podem ver curtidas" ON public.battle_comment_likes;
DROP POLICY IF EXISTS "Usuários autenticados podem curtir comentários" ON public.battle_comment_likes;
DROP POLICY IF EXISTS "Usuários podem descurtir seus próprios likes" ON public.battle_comment_likes;

-- Políticas de acesso
CREATE POLICY "Todos podem ver curtidas" 
  ON public.battle_comment_likes FOR SELECT 
  USING (true);

CREATE POLICY "Usuários autenticados podem curtir comentários" 
  ON public.battle_comment_likes FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.battle_comments 
      WHERE battle_comments.id = battle_comment_likes.comment_id
    )
  );

CREATE POLICY "Usuários podem descurtir seus próprios likes" 
  ON public.battle_comment_likes FOR DELETE 
  USING (auth.uid() = user_id);

-- 4. Alterar tipo da coluna duration_hours para suportar decimais (para testes com 10 segundos)
ALTER TABLE public.opinion_battles 
ALTER COLUMN duration_hours TYPE numeric(10, 4) USING duration_hours::numeric(10, 4);

-- Garantir que a coluna winner_side existe (caso a tabela já exista sem ela)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'opinion_battles' 
    AND column_name = 'winner_side'
  ) THEN
    ALTER TABLE public.opinion_battles 
    ADD COLUMN winner_side text CHECK (winner_side IN ('agree', 'disagree'));
  END IF;
END $$;

-- 5. Adicionar campo de pontuação de crítico na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS critic_score integer DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.critic_score IS 'Pontuação acumulada do usuário no ranking de crítico. Ganha pontos ao vencer batalhas de opiniões.';

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para opinion_battles
CREATE INDEX IF NOT EXISTS idx_opinion_battles_creator ON public.opinion_battles(creator_id);
CREATE INDEX IF NOT EXISTS idx_opinion_battles_status ON public.opinion_battles(status);
CREATE INDEX IF NOT EXISTS idx_opinion_battles_ends_at ON public.opinion_battles(ends_at);
CREATE INDEX IF NOT EXISTS idx_opinion_battles_public ON public.opinion_battles(is_public, status);
CREATE INDEX IF NOT EXISTS idx_opinion_battles_tmdb ON public.opinion_battles(tmdb_id);

-- Índices para battle_comments
CREATE INDEX IF NOT EXISTS idx_battle_comments_battle ON public.battle_comments(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_comments_user ON public.battle_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_comments_side ON public.battle_comments(battle_id, side);
CREATE INDEX IF NOT EXISTS idx_battle_comments_likes ON public.battle_comments(likes_count DESC);

-- Índices para battle_comment_likes
CREATE INDEX IF NOT EXISTS idx_battle_likes_comment ON public.battle_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_battle_likes_user ON public.battle_comment_likes(user_id);

-- Índice para critic_score (para ranking)
CREATE INDEX IF NOT EXISTS idx_profiles_critic_score ON public.profiles(critic_score DESC);

-- ============================================
-- TRIGGERS PARA ATUALIZAÇÃO AUTOMÁTICA
-- ============================================

-- Função para atualizar likes_count quando uma curtida é adicionada/removida
CREATE OR REPLACE FUNCTION update_battle_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.battle_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.battle_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de likes
DROP TRIGGER IF EXISTS trigger_update_battle_comment_likes ON public.battle_comment_likes;
CREATE TRIGGER trigger_update_battle_comment_likes
  AFTER INSERT OR DELETE ON public.battle_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_battle_comment_likes_count();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS trigger_opinion_battles_updated_at ON public.opinion_battles;
CREATE TRIGGER trigger_opinion_battles_updated_at
  BEFORE UPDATE ON public.opinion_battles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_battle_comments_updated_at ON public.battle_comments;
CREATE TRIGGER trigger_battle_comments_updated_at
  BEFORE UPDATE ON public.battle_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNÇÃO PARA ATRIBUIR PONTOS AO VENCEDOR
-- ============================================

-- Função para adicionar pontos ao vencedor de uma batalha
CREATE OR REPLACE FUNCTION award_battle_winner_points()
RETURNS TRIGGER AS $$
DECLARE
  winner_user_id uuid;
  points_to_award integer := 10; -- Pontos por vitória (pode ser ajustado)
BEGIN
  -- Só processa se a batalha foi finalizada e tem um vencedor
  IF NEW.status = 'ended' AND NEW.winner_comment_id IS NOT NULL THEN
    -- Busca o user_id do comentário vencedor
    SELECT user_id INTO winner_user_id
    FROM public.battle_comments
    WHERE id = NEW.winner_comment_id;
    
    -- Adiciona pontos ao vencedor
    IF winner_user_id IS NOT NULL THEN
      UPDATE public.profiles
      SET critic_score = critic_score + points_to_award
      WHERE id = winner_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atribuir pontos quando uma batalha é finalizada
DROP TRIGGER IF EXISTS trigger_award_battle_winner ON public.opinion_battles;
CREATE TRIGGER trigger_award_battle_winner
  AFTER UPDATE ON public.opinion_battles
  FOR EACH ROW
  WHEN (OLD.status = 'active' AND NEW.status = 'ended' AND NEW.winner_comment_id IS NOT NULL)
  EXECUTE FUNCTION award_battle_winner_points();

