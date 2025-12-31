-- Add Supply fields to Stamps table
ALTER TABLE public.stamps 
ADD COLUMN IF NOT EXISTS max_supply integer DEFAULT NULL, -- NULL means infinite
ADD COLUMN IF NOT EXISTS current_supply integer DEFAULT 0;

-- Index for supply checks
CREATE INDEX IF NOT EXISTS idx_stamps_supply ON public.stamps(max_supply, current_supply);
