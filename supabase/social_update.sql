-- --- SOCIAL GRAPH AND NOTIFICATIONS ---

-- 1. Tabela de Relacionamentos (Seguidores)
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) not null,
  following_id uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (follower_id, following_id)
);

-- RLS para follows
alter table public.follows enable row level security;
create policy "Qualquer um pode ver seguidores." on public.follows for select using (true);
create policy "Usuarios podem seguir outros." on public.follows for insert with check (auth.uid() = follower_id);
create policy "Usuarios podem deixar de seguir." on public.follows for delete using (auth.uid() = follower_id);

-- 2. Tabela de Notificações
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null, -- Quem recebe a notificação
  actor_id uuid references public.profiles(id) not null, -- Quem causou a notificação
  type text not null, -- 'follow', 'like', 'comment'
  content text, 
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS para notificações
alter table public.notifications enable row level security;
create policy "Usuarios veem suas proprias notificacoes." on public.notifications for select using (auth.uid() = user_id);
create policy "Qualquer um pode criar notificacao (via trigger ou server)." on public.notifications for insert with check (auth.role() = 'authenticated'); 
-- Na prática, triggers são melhores, mas insert direto facilita pro MVP frontend
create policy "Usuarios podem marcar como lido." on public.notifications for update using (auth.uid() = user_id);
