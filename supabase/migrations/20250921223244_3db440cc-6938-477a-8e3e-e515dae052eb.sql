-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "profiles are readable by everyone" ON public.profiles;

-- Create a policy for users to view their own complete profile (including email)
CREATE POLICY "Users can view their own complete profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Create a policy for viewing public profile information (excluding email)
-- This will require application-level filtering for email addresses
CREATE POLICY "Public profile information viewable by authenticated users" ON public.profiles
FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() != id);

-- Allow unauthenticated users to view basic public profile info (for public features)
CREATE POLICY "Basic profile info viewable by unauthenticated users" ON public.profiles
FOR SELECT USING (auth.uid() IS NULL);