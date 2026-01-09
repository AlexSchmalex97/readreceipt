-- Add completed_at timestamp to books table for precise same-day ordering
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;