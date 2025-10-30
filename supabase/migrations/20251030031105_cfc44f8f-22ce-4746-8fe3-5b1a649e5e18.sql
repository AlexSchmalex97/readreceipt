-- Ensure profiles are created on signup and auto-follow with @Alex
-- 1) Create trigger to insert into public.profiles when a new auth user is created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2) Update handle_new_user to respect display_name from metadata when provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    updated_at = now();
  RETURN NEW;
END;
$$;

-- 3) Create trigger to auto-follow with @Alex when a profile is created
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

-- 4) Ensure unique follows to avoid duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_follows_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_follows_unique ON public.follows (follower_id, following_id);
  END IF;
END $$;

-- 5) Backfill: make every existing user mutually follow @Alex (case-insensitive username match)
DO $$
DECLARE
  alex_user_id uuid;
  user_rec RECORD;
BEGIN
  SELECT id INTO alex_user_id
  FROM public.profiles
  WHERE username ILIKE 'alex'
  LIMIT 1;

  IF alex_user_id IS NOT NULL THEN
    FOR user_rec IN SELECT id FROM public.profiles WHERE id <> alex_user_id LOOP
      -- User follows Alex
      INSERT INTO public.follows (follower_id, following_id)
      SELECT user_rec.id, alex_user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.follows f WHERE f.follower_id = user_rec.id AND f.following_id = alex_user_id
      );

      -- Alex follows user
      INSERT INTO public.follows (follower_id, following_id)
      SELECT alex_user_id, user_rec.id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.follows f WHERE f.follower_id = alex_user_id AND f.following_id = user_rec.id
      );
    END LOOP;
  END IF;
END $$;