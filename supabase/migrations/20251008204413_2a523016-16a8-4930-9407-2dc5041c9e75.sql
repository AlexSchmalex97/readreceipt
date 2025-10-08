-- Create book-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true);

-- Allow authenticated users to upload their own book covers
CREATE POLICY "Users can upload book covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view all book covers
CREATE POLICY "Anyone can view book covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'book-covers');

-- Allow users to update their own book covers
CREATE POLICY "Users can update their own book covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own book covers
CREATE POLICY "Users can delete their own book covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'book-covers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);