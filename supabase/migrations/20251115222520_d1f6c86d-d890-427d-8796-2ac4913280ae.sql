-- Create a table to store user's saved background images
CREATE TABLE IF NOT EXISTS public.saved_backgrounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  tint_color TEXT,
  tint_opacity NUMERIC DEFAULT 0,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_backgrounds ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_backgrounds
CREATE POLICY "Users can view their own saved backgrounds"
ON public.saved_backgrounds
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved backgrounds"
ON public.saved_backgrounds
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved backgrounds"
ON public.saved_backgrounds
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved backgrounds"
ON public.saved_backgrounds
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_saved_backgrounds_updated_at
BEFORE UPDATE ON public.saved_backgrounds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add fields to profiles to track active background type and selected background
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS background_type TEXT DEFAULT 'color' CHECK (background_type IN ('color', 'image')),
ADD COLUMN IF NOT EXISTS active_background_id UUID REFERENCES public.saved_backgrounds(id) ON DELETE SET NULL;