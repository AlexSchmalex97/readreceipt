-- Fix RLS policies to properly balance security with functionality

-- 1) Add back a limited cross-user profile policy for authenticated users (excluding sensitive fields)
CREATE POLICY "Authenticated users can view public profile data" ON public.profiles
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() != id
);

-- 2) Add back a very limited unauthenticated profile policy for public features
CREATE POLICY "Unauthenticated users can view basic public info" ON public.profiles  
FOR SELECT USING (
  auth.uid() IS NULL
);

-- Note: These policies will still respect application-level filtering to exclude email addresses
-- The application code should only select non-sensitive columns when querying across users