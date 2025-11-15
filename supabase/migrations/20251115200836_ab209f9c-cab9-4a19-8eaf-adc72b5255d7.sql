-- Add top_five_books column to profiles table to store array of book IDs
ALTER TABLE public.profiles
ADD COLUMN top_five_books jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.top_five_books IS 'Array of book IDs representing user''s top 5 favorite books in order';