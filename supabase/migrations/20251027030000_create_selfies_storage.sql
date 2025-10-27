-- Create selfies storage bucket and policies
-- This migration sets up the storage bucket for selfie uploads

-- Create the selfies bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload files only to their own folder
CREATE POLICY "Users can upload selfies to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own selfies
CREATE POLICY "Users can view own selfies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Public read access (for displaying selfies in the app)
-- Note: This allows anyone with the URL to view the selfie
-- If you want more security, remove this policy and use signed URLs
CREATE POLICY "Public read access to selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies');

-- Policy: Users can delete their own selfies
CREATE POLICY "Users can delete own selfies"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);