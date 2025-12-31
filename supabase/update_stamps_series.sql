-- Add Series fields to Stamps table
ALTER TABLE public.stamps 
ADD COLUMN IF NOT EXISTS tmdb_id integer,
ADD COLUMN IF NOT EXISTS series_title text;
