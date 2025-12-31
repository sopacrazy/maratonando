-- Tabela de Likes (Quem curtiu o quê)
create table if not exists public.post_likes (
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, post_id)
);

alter table public.post_likes enable row level security;
create policy "Todos podem ver likes." on public.post_likes for select using (true);
create policy "Usuarios podem dar like." on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Usuarios podem remover like." on public.post_likes for delete using (auth.uid() = user_id);

-- Tabela de Comentários
create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.post_comments enable row level security;
create policy "Todos podem ver comentarios." on public.post_comments for select using (true);
create policy "Usuarios podem comentar." on public.post_comments for insert with check (auth.uid() = user_id);
create policy "Usuarios podem deletar seus comentarios." on public.post_comments for delete using (auth.uid() = user_id);
