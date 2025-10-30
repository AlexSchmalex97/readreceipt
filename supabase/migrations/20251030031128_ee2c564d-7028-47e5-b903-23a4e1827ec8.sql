-- Fix security warnings: add search_path to functions that are missing it

-- 1) Update update_current_book function to set search_path
CREATE OR REPLACE FUNCTION public.update_current_book()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  most_recent_book_id uuid;
BEGIN
  -- Find the most recently updated in-progress book for this user
  SELECT id INTO most_recent_book_id
  FROM books
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND status = 'in_progress'
    AND current_page < total_pages
  ORDER BY updated_at DESC NULLS LAST, created_at DESC
  LIMIT 1;

  -- Update the profile's current_book_id
  UPDATE profiles
  SET current_book_id = most_recent_book_id
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN NEW;
END;
$function$;

-- 2) Update sync_profile_email function to set search_path
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email, updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;