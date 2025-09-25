-- Add current_book_id to profiles table for Current Read section
ALTER TABLE public.profiles ADD COLUMN current_book_id uuid;

-- Add book_id to posts table for book-specific posts
ALTER TABLE public.posts ADD COLUMN book_id uuid;

-- Add color_palette to profiles table for user customization
ALTER TABLE public.profiles ADD COLUMN color_palette jsonb DEFAULT '{"name": "default"}'::jsonb;