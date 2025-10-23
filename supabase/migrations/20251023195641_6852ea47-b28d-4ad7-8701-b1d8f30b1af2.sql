-- Create a function to automatically have @Alex follow new users
CREATE OR REPLACE FUNCTION public.auto_follow_new_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alex_user_id uuid;
BEGIN
  -- Find Alex's user ID by username
  SELECT id INTO alex_user_id
  FROM public.profiles
  WHERE username = 'Alex'
  LIMIT 1;

  -- If Alex exists and the new user is not Alex, create the follow relationship
  IF alex_user_id IS NOT NULL AND NEW.id != alex_user_id THEN
    INSERT INTO public.follows (follower_id, following_id, created_at)
    VALUES (alex_user_id, NEW.id, now())
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-follow new users
DROP TRIGGER IF EXISTS trigger_auto_follow_new_users ON public.profiles;
CREATE TRIGGER trigger_auto_follow_new_users
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_follow_new_users();