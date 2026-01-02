-- Insert profile for user lexydotcom
INSERT INTO public.profiles (id, username, display_name, email, created_at)
VALUES (
  '10557d8a-2622-409f-8fd6-43be901ce36d',
  'lexydotcom',
  'Lexy',
  'lexyyy816@gmail.com',
  now()
);

-- Also ensure she follows @alex (auto-follow)
INSERT INTO public.follows (follower_id, following_id, created_at)
VALUES (
  '10557d8a-2622-409f-8fd6-43be901ce36d',
  '20f0b8e9-ad64-4948-b257-e06b42f1e617',
  now()
)
ON CONFLICT DO NOTHING;