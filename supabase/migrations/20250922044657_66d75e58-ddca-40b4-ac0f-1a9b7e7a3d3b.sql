-- Add cover_url column to books table
ALTER TABLE public.books 
ADD COLUMN cover_url TEXT;