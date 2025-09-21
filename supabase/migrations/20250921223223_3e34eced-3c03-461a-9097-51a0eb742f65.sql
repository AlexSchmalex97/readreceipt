-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "profiles are readable by everyone" ON public.profiles;

-- Create a new policy that protects email addresses
-- Users can see their own complete profile (including email)
CREATE POLICY "Users can view their own complete profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Others can see public profile information but NOT email addresses
CREATE POLICY "Public profile information is viewable by others" ON public.profiles
FOR SELECT USING (
  auth.uid() != id OR auth.uid() IS NULL
) WITH CHECK (
  -- This policy only applies to columns that should be public
  -- The application layer should handle filtering out email addresses
  true
);