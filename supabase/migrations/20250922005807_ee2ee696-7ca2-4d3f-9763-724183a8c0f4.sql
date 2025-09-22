-- Remove the recursive SELECT policy on follows to fix infinite recursion
DROP POLICY IF EXISTS "Users can view follows of people they follow (for discovery)" ON public.follows;

-- Ensure a single non-recursive SELECT policy remains
DROP POLICY IF EXISTS "Users can view their own follows" ON public.follows;
CREATE POLICY "Users can view their own follows"
ON public.follows
FOR SELECT
USING (auth.uid() = follower_id OR auth.uid() = following_id);
