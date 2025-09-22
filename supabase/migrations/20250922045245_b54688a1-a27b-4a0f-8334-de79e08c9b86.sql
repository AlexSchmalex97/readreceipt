-- Add cover_url column to tbr_books table
ALTER TABLE public.tbr_books 
ADD COLUMN cover_url TEXT;