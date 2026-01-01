-- Script para zerar as moedas de todos os usuários
-- Execute este script no Supabase SQL Editor

-- Zerar todas as moedas dos perfis existentes
UPDATE public.profiles
SET coins = 0
WHERE coins > 0;

-- Atualizar o valor padrão para novos usuários também começarem com 0 moedas
ALTER TABLE public.profiles ALTER COLUMN coins SET DEFAULT 0;

-- Verificar quantos usuários foram atualizados
SELECT COUNT(*) as usuarios_atualizados
FROM public.profiles
WHERE coins = 0;

