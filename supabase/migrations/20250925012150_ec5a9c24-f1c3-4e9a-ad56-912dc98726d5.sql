-- Fix security definer view issues
-- First drop the existing view that was flagged
DROP VIEW IF EXISTS public.users_with_usernames;

-- Add proper search path to get_public_profiles function
CREATE OR REPLACE FUNCTION public.get_public_profiles(search text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE (
    search IS NULL OR length(trim(search)) = 0
    OR p.username ILIKE '%' || search || '%'
    OR p.display_name ILIKE '%' || search || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$function$;

-- Add proper search path to get_public_profiles_by_ids function
CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(ids uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE p.id = ANY(ids);
$function$;

-- Add proper search path to get_safe_public_profiles function
CREATE OR REPLACE FUNCTION public.get_safe_public_profiles(search text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.created_at
  FROM public.profiles p
  WHERE (
    search IS NULL OR length(trim(search)) = 0
    OR p.username ILIKE '%' || search || '%'
    OR p.display_name ILIKE '%' || search || '%'
  )
  ORDER BY p.created_at DESC
  LIMIT GREATEST(1, LEAST(limit_count, 100));
$function$;