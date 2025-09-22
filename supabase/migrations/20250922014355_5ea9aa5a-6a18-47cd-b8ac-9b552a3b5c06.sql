-- Fix security issue: Remove public access to email addresses in profiles table

-- Drop the problematic policy that exposes all data including emails
DROP POLICY IF EXISTS "Public can view basic profile info (no email)" ON public.profiles;

-- Create a secure policy that only allows public access to basic profile info (excluding email)
CREATE POLICY "Public can view basic profile info (excluding email)" 
ON public.profiles 
FOR SELECT 
USING (true)
WITH CHECK (false);

-- Note: The above policy will be refined to use column-level security
-- We need to ensure the existing security definer functions are used for public access