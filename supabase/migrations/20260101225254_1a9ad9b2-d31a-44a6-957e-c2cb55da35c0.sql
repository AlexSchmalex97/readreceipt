-- Ensure all users follow @alex (user ID: 20f0b8e9-ad64-4948-b257-e06b42f1e617)
-- 1) Update the auto_follow_new_users function to make new users follow Alex (not mutual)
CREATE OR REPLACE FUNCTION public.auto_follow_new_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  alex_user_id uuid := '20f0b8e9-ad64-4948-b257-e06b42f1e617';
BEGIN
  -- If the new user is not Alex, make them follow Alex
  IF NEW.id != alex_user_id THEN
    INSERT INTO public.follows (follower_id, following_id, created_at)
    VALUES (NEW.id, alex_user_id, now())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Ensure the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_profile_created_auto_follow'
  ) THEN
    CREATE TRIGGER on_profile_created_auto_follow
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.auto_follow_new_users();
  END IF;
END $$;

-- 3) Backfill: make ALL existing users follow @alex
INSERT INTO public.follows (follower_id, following_id, created_at)
SELECT p.id, '20f0b8e9-ad64-4948-b257-e06b42f1e617', now()
FROM public.profiles p
WHERE p.id != '20f0b8e9-ad64-4948-b257-e06b42f1e617'
  AND NOT EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = p.id
      AND f.following_id = '20f0b8e9-ad64-4948-b257-e06b42f1e617'
  )
ON CONFLICT DO NOTHING;