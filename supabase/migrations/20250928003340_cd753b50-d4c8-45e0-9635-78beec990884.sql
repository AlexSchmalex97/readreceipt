-- Add start and end date columns to books table
ALTER TABLE public.books 
ADD COLUMN started_at date,
ADD COLUMN finished_at date;

-- Create reading_goals table
CREATE TABLE public.reading_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  year integer NOT NULL,
  goal_count integer NOT NULL DEFAULT 12,
  manual_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS on reading_goals
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for reading_goals
CREATE POLICY "Users can view their own reading goals" 
ON public.reading_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reading goals" 
ON public.reading_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading goals" 
ON public.reading_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading goals" 
ON public.reading_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on reading_goals
CREATE TRIGGER update_reading_goals_updated_at
BEFORE UPDATE ON public.reading_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();