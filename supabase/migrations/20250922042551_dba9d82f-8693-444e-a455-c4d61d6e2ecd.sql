-- Add temperature_unit column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN temperature_unit text DEFAULT 'celsius' CHECK (temperature_unit IN ('celsius', 'fahrenheit'));