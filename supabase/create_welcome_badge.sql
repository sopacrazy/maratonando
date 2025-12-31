-- Script para criar o selo de boas-vindas "maratonando"
-- Execute este script no Supabase SQL Editor

INSERT INTO stamps (
    id,
    name,
    description,
    rarity,
    image_url,
    series_name,
    tmdb_id,
    req_type,
    req_value,
    purchasable,
    price
) VALUES (
    gen_random_uuid(),
    'maratonando',
    'Bem-vindo à comunidade! Este selo é concedido a todos os novos membros.',
    'Comum',
    'https://example.com/badges/welcome.png', -- Substitua pela URL real da imagem
    NULL,
    NULL,
    'onboarding',
    0,
    false,
    NULL
)
ON CONFLICT (name) DO NOTHING;

-- Verificar se o selo foi criado
SELECT * FROM stamps WHERE name ILIKE '%maratonando%';
