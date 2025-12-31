-- 1. Add Role to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- 2. Create Stamps Table
CREATE TABLE IF NOT EXISTS public.stamps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text, -- "Command or task to acquire"
  image_url text NOT NULL,
  rarity text CHECK (rarity IN ('Comum', 'Raro', 'Épico', 'Lendário')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS for Stamps
ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;

-- Everyone can read stamps
CREATE POLICY "Public read stamps" ON public.stamps FOR SELECT USING (true);

-- Only Admins can insert/update/delete
-- Note: 'admin' role check relies on the profile table
CREATE POLICY "Admin insert stamps" ON public.stamps FOR INSERT 
WITH CHECK (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admin update stamps" ON public.stamps FOR UPDATE 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

CREATE POLICY "Admin delete stamps" ON public.stamps FOR DELETE 
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 4. Storage for Badges (Stamps)
insert into storage.buckets (id, name, public) 
values ('badges', 'badges', true) 
on conflict (id) do nothing;

create policy "Public Access Badges" 
  on storage.objects for select 
  using ( bucket_id = 'badges' );

create policy "Admin Upload Badges" 
  on storage.objects for insert 
  with check ( 
    bucket_id = 'badges' 
    and auth.role() = 'authenticated'
    and (select role from public.profiles where id = auth.uid()) = 'admin' 
  );
