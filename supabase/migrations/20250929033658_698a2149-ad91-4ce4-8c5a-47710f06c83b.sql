-- Add DNF status to books table
ALTER TABLE public.books ADD COLUMN status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'dnf'));

-- Create reading_entries table for multiple reading sessions
CREATE TABLE public.reading_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at DATE,
  finished_at DATE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'dnf')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reading_entries table
ALTER TABLE public.reading_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reading_entries
CREATE POLICY "Users can view their own reading entries" 
ON public.reading_entries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading entries" 
ON public.reading_entries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading entries" 
ON public.reading_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading entries" 
ON public.reading_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on reading_entries
CREATE TRIGGER update_reading_entries_updated_at
BEFORE UPDATE ON public.reading_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();