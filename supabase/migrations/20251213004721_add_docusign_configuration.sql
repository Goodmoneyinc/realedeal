-- Add DocuSign Configuration
-- 
-- 1. New Tables
--    - docusign_settings: Store DocuSign configuration per organization/user
--    
-- 2. Security
--    - Enable RLS to ensure only authorized users can manage settings

-- Create DocuSign settings table
CREATE TABLE IF NOT EXISTS docusign_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  account_id text NOT NULL,
  integration_key text NOT NULL,
  is_sandbox boolean DEFAULT true,
  webhook_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_docusign_settings_user ON docusign_settings(user_id);

-- Enable RLS
ALTER TABLE docusign_settings ENABLE ROW LEVEL SECURITY;

-- DocuSign settings policies
DROP POLICY IF EXISTS "Users can view their DocuSign settings" ON docusign_settings;
CREATE POLICY "Users can view their DocuSign settings"
  ON docusign_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their DocuSign settings" ON docusign_settings;
CREATE POLICY "Users can create their DocuSign settings"
  ON docusign_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their DocuSign settings" ON docusign_settings;
CREATE POLICY "Users can update their DocuSign settings"
  ON docusign_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their DocuSign settings" ON docusign_settings;
CREATE POLICY "Users can delete their DocuSign settings"
  ON docusign_settings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
