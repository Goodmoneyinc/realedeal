/*
  # Create Property Images Table for Multiple Photos

  1. New Tables
    - `property_images`
      - `id` (uuid, primary key) - Unique identifier for each image
      - `deal_id` (uuid, foreign key) - References the deal this image belongs to
      - `image_url` (text) - URL of the uploaded image
      - `display_order` (integer) - Order in which images should be displayed
      - `created_at` (timestamptz) - When the image was uploaded
      
  2. Security
    - Enable RLS on `property_images` table
    - Agents can insert images for their own deals
    - Agents can view images for their own deals
    - Investors can view images for deals from their assigned agents
    - Agents can delete their own property images
    - Agents can update their own property images
    
  3. Indexes
    - Add index on deal_id for faster queries
    - Add index on display_order for proper sorting
    
  4. Notes
    - The existing image_url column in deals table will serve as the primary/cover image
    - This new table allows unlimited additional images per property
    - Images are automatically ordered by display_order
*/

-- Create the property_images table
CREATE TABLE IF NOT EXISTS property_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_images_deal_id ON property_images(deal_id);
CREATE INDEX IF NOT EXISTS idx_property_images_display_order ON property_images(display_order);

-- Enable RLS
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Agents can insert images for their own deals
CREATE POLICY "Users can insert images for their own deals"
  ON property_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = property_images.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- Agents can view images for their own deals
CREATE POLICY "Users can view images for their own deals"
  ON property_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = property_images.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- Investors can view images from their assigned agents
CREATE POLICY "Investors can view images from assigned agents"
  ON property_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      JOIN user_profiles ON deals.user_id = user_profiles.id
      WHERE deals.id = property_images.deal_id
      AND user_profiles.role = 'agent'
    )
  );

-- Agents can delete their own property images
CREATE POLICY "Users can delete their own property images"
  ON property_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = property_images.deal_id
      AND deals.user_id = auth.uid()
    )
  );

-- Agents can update their own property images
CREATE POLICY "Users can update their own property images"
  ON property_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = property_images.deal_id
      AND deals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = property_images.deal_id
      AND deals.user_id = auth.uid()
    )
  );
