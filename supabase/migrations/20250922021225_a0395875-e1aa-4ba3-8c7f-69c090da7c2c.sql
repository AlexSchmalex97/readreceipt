-- Add display preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN display_preference TEXT DEFAULT 'quotes' CHECK (display_preference IN ('quotes', 'time_weather'));