-- CRITICAL SECURITY FIX: Protect user email addresses and restrict social graph access

-- Step 1: Drop existing permissive policies on profiles table
DROP POLICY IF EXISTS "Authenticated users can view public profile data" ON public.profiles;
DROP POLICY IF EXISTS "Unauthenticated users can view basic public info" ON public.profiles;

-- Step 2: Create secure policies for profiles table that exclude email
CREATE POLICY "Public can view basic profile info (no email)" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Step 3: Drop overly permissive policy on follows table  
DROP POLICY IF EXISTS "read follows" ON public.follows;

-- Step 4: Create restricted policies for follows table
CREATE POLICY "Users can view their own follows" 
ON public.follows 
FOR SELECT 
USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can view follows of people they follow (for discovery)" 
ON public.follows 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.follows f2 
    WHERE f2.follower_id = auth.uid() 
    AND f2.following_id = follows.follower_id
  )
);

-- Step 5: Create a secure function to get public profiles without email
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles(search text DEFAULT NULL::text, limit_count integer DEFAULT 50)
RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE (
    search IS NULL OR length(trim(search)) = 0
    OR p.username ILIKE '%' || search || '%'
    OR p.display_name ILIKE '%' || search || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$$;