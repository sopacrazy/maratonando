-- Add Marketplace fields to Stamps table
ALTER TABLE public.stamps 
ADD COLUMN IF NOT EXISTS price integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS purchasable boolean DEFAULT false;

-- Index to quickly find items for sale in the shop
CREATE INDEX IF NOT EXISTS idx_stamps_purchasable ON public.stamps(purchasable);
