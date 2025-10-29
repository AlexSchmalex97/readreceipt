-- Update the auto-follow function to create mutual follows
CREATE OR REPLACE FUNCTION public.auto_follow_new_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  alex_user_id uuid;
BEGIN
  -- Find Alex's user ID by username
  SELECT id INTO alex_user_id
  FROM public.profiles
  WHERE username = 'Alex'
  LIMIT 1;

  -- If Alex exists and the new user is not Alex, create mutual follow relationships
  IF alex_user_id IS NOT NULL AND NEW.id != alex_user_id THEN
    -- Alex follows the new user
    INSERT INTO public.follows (follower_id, following_id, created_at)
    VALUES (alex_user_id, NEW.id, now())
    ON CONFLICT DO NOTHING;
    
    -- New user follows Alex
    INSERT INTO public.follows (follower_id, following_id, created_at)
    VALUES (NEW.id, alex_user_id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;