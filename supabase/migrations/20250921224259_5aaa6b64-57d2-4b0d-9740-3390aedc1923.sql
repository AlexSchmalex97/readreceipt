-- Phase: Restrict email exposure and provide safe public access via RPC

-- 1) Tighten RLS on profiles: only owners can SELECT full rows; remove public cross-user read
DROP POLICY IF EXISTS "Basic profile info viewable by unauthenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Public profile information viewable by authenticated users" ON public.profiles;

-- Keep existing policies:
--   "Users can view their own complete profile" (SELECT USING auth.uid() = id)
--   "update own profile" (UPDATE USING auth.uid() = id)

-- 2) Create SECURITY DEFINER functions to expose ONLY non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_public_profiles(search text DEFAULT NULL, limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz
) AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE (
    search IS NULL OR length(trim(search)) = 0
    OR p.username ILIKE '%' || search || '%'
    OR p.display_name ILIKE '%' || search || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(ids uuid[])
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz
) AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(ids);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 3) Grant execute to anon & authenticated roles
GRANT EXECUTE ON FUNCTION public.get_public_profiles(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_by_ids(uuid[]) TO anon, authenticated;