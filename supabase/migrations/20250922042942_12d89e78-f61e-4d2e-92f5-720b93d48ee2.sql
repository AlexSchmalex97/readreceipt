-- Create TBR (To Be Read) table
CREATE TABLE public.tbr_books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  total_pages INTEGER,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tbr_books ENABLE ROW LEVEL SECURITY;

-- Create policies for TBR books
CREATE POLICY "Users can view their own TBR books" 
ON public.tbr_books 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own TBR books" 
ON public.tbr_books 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TBR books" 
ON public.tbr_books 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TBR books" 
ON public.tbr_books 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_tbr_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tbr_books_updated_at
BEFORE UPDATE ON public.tbr_books
FOR EACH ROW
EXECUTE FUNCTION public.update_tbr_books_updated_at();