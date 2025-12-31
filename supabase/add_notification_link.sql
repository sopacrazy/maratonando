-- Add link column to notifications for better navigation
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS link text;

-- Optional: Add post_id if you prefer strong relations
-- ADD COLUMN IF NOT EXISTS post_id uuid references public.posts(id);
