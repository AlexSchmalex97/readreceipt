-- Add 'both' option to display preference
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_display_preference_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_display_preference_check 
CHECK (display_preference IN ('quotes', 'time_weather', 'both'));