-- Allow public read access to follows for counting followers/following
-- This is safe since follow relationships are not sensitive data
CREATE POLICY "Public can view all follows for counting"
ON public.follows
FOR SELECT
USING (true);

-- Allow public read access to books for viewing other users' bookshelves
-- This enables the user profile pages to show correct book counts and lists
CREATE POLICY "Public can view all books"
ON public.books
FOR SELECT
USING (true);

-- Allow public read access to saved_backgrounds so visitors can see profile backgrounds
CREATE POLICY "Public can view saved backgrounds"
ON public.saved_backgrounds
FOR SELECT
USING (true);