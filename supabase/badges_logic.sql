-- 1. Tabela de Possessão de Selos (Quais usuários têm quais selos)
CREATE TABLE IF NOT EXISTS public.user_stamps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  stamp_id uuid REFERENCES public.stamps(id) NOT NULL,
  obtained_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, stamp_id) -- Impede ter o mesmo selo duas vezes (por enquanto)
);

-- RLS para user_stamps
ALTER TABLE public.user_stamps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem selos dos usuarios" ON public.user_stamps FOR SELECT USING (true);
CREATE POLICY "Sistema atribui selos" ON public.user_stamps FOR INSERT WITH CHECK (auth.role() = 'authenticated'); 

-- 2. Adicionar Campos de Regra Lógica na tabela Stamps
ALTER TABLE public.stamps 
ADD COLUMN IF NOT EXISTS req_type text, -- Ex: 'post_count', 'series_completed'
ADD COLUMN IF NOT EXISTS req_value integer DEFAULT 0; -- Ex: 2, 5, 10

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_stamps_user ON public.user_stamps(user_id);
CREATE INDEX IF NOT EXISTS idx_stamps_req ON public.stamps(req_type, tmdb_id);
