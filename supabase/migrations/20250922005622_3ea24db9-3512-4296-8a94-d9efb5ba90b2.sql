-- Fix RLS policies on books table to allow reading book info when needed for reviews/progress

-- Drop existing restrictive policy on books table
DROP POLICY IF EXISTS "Read own" ON public.books;
DROP POLICY IF EXISTS "Insert own" ON public.books;
DROP POLICY IF EXISTS "Update own" ON public.books;
DROP POLICY IF EXISTS "Delete own" ON public.books;

-- Create new policies that allow reading book info for reviews and progress
CREATE POLICY "Users can read their own books" 
ON public.books 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can read books that have public reviews" 
ON public.books 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reviews 
    WHERE reviews.book_id = books.id
  )
);

CREATE POLICY "Users can read books with progress from followed users" 
ON public.books 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.reading_progress rp
    JOIN public.follows f ON f.following_id = rp.user_id
    WHERE rp.book_id = books.id 
    AND f.follower_id = auth.uid()
  )
);

-- Keep the other policies for insert/update/delete
CREATE POLICY "Users can insert their own books" 
ON public.books 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books" 
ON public.books 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books" 
ON public.books 
FOR DELETE 
USING (auth.uid() = user_id);