-- Add policy to allow public viewing of TBR books
CREATE POLICY "Public can view TBR books" 
ON public.tbr_books 
FOR SELECT 
USING (true);