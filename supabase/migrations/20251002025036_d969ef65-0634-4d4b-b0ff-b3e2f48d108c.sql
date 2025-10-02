-- Add dnf_type column to books table
ALTER TABLE public.books 
ADD COLUMN dnf_type text CHECK (dnf_type IN ('soft', 'hard') OR dnf_type IS NULL);