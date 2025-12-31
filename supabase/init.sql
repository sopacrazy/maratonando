-- Tabela de Perfis Públicos (Vinculada ao Auth do Supabase)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  handle text unique,
  avatar text default 'https://placeholder.pics/svg/150',
  bio text,
  coins integer default 2450,
  profile_theme text default 'default',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar segurança para Profiles
alter table public.profiles enable row level security;

-- Políticas de Profiles
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- --- NOVAS TABELAS PARA ATUALIZAÇÃO ---

-- 1. Tabela de Séries do Usuário (Relacionamento Usuário <-> Série TMDB)
create table if not exists public.user_series (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  tmdb_id integer not null,
  title text not null,
  poster_path text,
  status text default 'watching', -- 'watching', 'completed', 'plan_to_watch', 'dropped'
  rating integer, -- 0 a 5 ou 0 a 10
  review text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, tmdb_id) -- Impede duplicidade da mesma série para o mesmo usuário
);

-- RLS para user_series
alter table public.user_series enable row level security;
create policy "Qualquer um pode ver séries dos usuarios." on public.user_series for select using (true);
create policy "Usuario gerencia suas proprias series." on public.user_series for all using (auth.uid() = user_id);

-- 2. Tabela de Publicações (Feed)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  content text,
  image_url text, -- URL da imagem no Storage
  tmdb_id integer, -- Opcional: vinculado a uma série específica
  series_title text, -- Opcional: nome da série vinculada
  is_spoiler boolean default false, -- Indica se o post contém spoilers
  spoiler_topic text, -- Tópico/série sobre a qual o spoiler se refere
  likes_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para posts
alter table public.posts enable row level security;
create policy "Public posts are viewable by everyone." on public.posts for select using (true);
create policy "Users can create posts." on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts." on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts." on public.posts for delete using (auth.uid() = user_id);

-- --- STORAGE (Criado via SQL) ---

-- Bucket 'post-images'
insert into storage.buckets (id, name, public) 
values ('post-images', 'post-images', true) 
on conflict (id) do nothing;

create policy "Public Access Post Images" 
  on storage.objects for select 
  using ( bucket_id = 'post-images' );

create policy "Authenticated Uploads Post Images" 
  on storage.objects for insert 
  with check ( bucket_id = 'post-images' and auth.role() = 'authenticated' );

-- Bucket 'avatars' (NOVO)
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

create policy "Public Access Avatars" 
  on storage.objects for select 
  using ( bucket_id = 'avatars' );

create policy "Authenticated Uploads Avatars" 
  on storage.objects for insert 
  with check ( bucket_id = 'avatars' and auth.role() = 'authenticated' );
