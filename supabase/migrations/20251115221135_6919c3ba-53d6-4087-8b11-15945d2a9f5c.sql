-- Add background_image_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS background_image_url TEXT;