
-- Add published_year to books table
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS published_year integer;

-- Add published_year to tbr_books table
ALTER TABLE public.tbr_books ADD COLUMN IF NOT EXISTS published_year integer;
