-- Fix infinite recursion in RLS policies and ensure proper foreign key relationships

-- First, fix the reading_progress RLS policy to avoid infinite recursion
DROP POLICY IF EXISTS "read own or followed progress" ON public.reading_progress;

-- Create a simpler policy that doesn't cause recursion
CREATE POLICY "Users can read own progress" 
ON public.reading_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can read followed users progress" 
ON public.reading_progress 
FOR SELECT 
USING (
  auth.uid() != user_id AND 
  EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follower_id = auth.uid() 
    AND following_id = reading_progress.user_id
  )
);

-- Ensure foreign key constraint exists for reading_progress -> books
ALTER TABLE public.reading_progress 
DROP CONSTRAINT IF EXISTS reading_progress_book_id_fkey;

ALTER TABLE public.reading_progress 
ADD CONSTRAINT reading_progress_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) 
ON DELETE CASCADE;

-- Ensure foreign key constraint exists for reviews -> books  
ALTER TABLE public.reviews 
DROP CONSTRAINT IF EXISTS reviews_book_id_fkey;

ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) 
ON DELETE CASCADE;