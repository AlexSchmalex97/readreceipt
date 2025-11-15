-- Add background_tint column to profiles table for storing tint color and opacity
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS background_tint JSONB DEFAULT NULL;