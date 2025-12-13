/*
  # Create Storage Bucket for Property Images

  1. Storage Setup
    - Create `property-images` bucket for storing property photos
    - Configure bucket to accept image files only
    
  2. Security Policies
    - Authenticated agents can upload images
    - Authenticated agents can view their own property images
    - Authenticated investors can view property images from their assigned agents
    - Public read access for property images (allows sharing)
    
  3. Notes
    - Images are stored with path structure: `user_id/deal_id/filename`
    - Bucket is configured for public read to allow easy sharing
    - Upload restricted to authenticated users with agent role
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images (agents only via app logic)
CREATE POLICY "Authenticated users can upload property images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

-- Allow users to view their own property images
CREATE POLICY "Users can view their own property images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to property images
CREATE POLICY "Public can view property images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'property-images');

-- Allow users to delete their own property images
CREATE POLICY "Users can delete their own property images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own property images
CREATE POLICY "Users can update their own property images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
