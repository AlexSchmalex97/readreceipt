-- First, let's make sure existing users also follow Alex mutually
DO $$
DECLARE
  alex_user_id uuid;
  user_record RECORD;
BEGIN
  -- Find Alex's user ID
  SELECT id INTO alex_user_id
  FROM public.profiles
  WHERE username = 'Alex'
  LIMIT 1;

  -- If Alex exists, create mutual follows for all existing users
  IF alex_user_id IS NOT NULL THEN
    FOR user_record IN 
      SELECT id FROM public.profiles WHERE id != alex_user_id
    LOOP
      -- Alex follows the user
      INSERT INTO public.follows (follower_id, following_id, created_at)
      VALUES (alex_user_id, user_record.id, now())
      ON CONFLICT DO NOTHING;
      
      -- User follows Alex
      INSERT INTO public.follows (follower_id, following_id, created_at)
      VALUES (user_record.id, alex_user_id, now())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;