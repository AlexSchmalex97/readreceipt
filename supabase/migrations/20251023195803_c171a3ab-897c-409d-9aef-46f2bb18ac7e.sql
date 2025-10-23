-- Backfill: Add @Alex as a follower for all existing users
INSERT INTO public.follows (follower_id, following_id, created_at)
SELECT 
  (SELECT id FROM public.profiles WHERE username = 'Alex' LIMIT 1) as follower_id,
  p.id as following_id,
  now() as created_at
FROM public.profiles p
WHERE p.username != 'Alex'
  AND (SELECT id FROM public.profiles WHERE username = 'Alex' LIMIT 1) IS NOT NULL
ON CONFLICT DO NOTHING;