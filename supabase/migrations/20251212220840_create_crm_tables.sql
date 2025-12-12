/*
  # Create CRM Tables for Real Estate Investment Platform

  ## Overview
  This migration creates the foundational tables for a multi-user real estate investment CRM system.

  ## New Tables
  
  ### `deals`
  - `id` (uuid, primary key) - Unique deal identifier
  - `user_id` (uuid, foreign key) - Owner of the deal
  - `title` (text) - Property title/name
  - `location` (text) - Property address/location
  - `property_type` (text) - Type of property (single-family, multi-family, etc.)
  - `deal_type` (text) - Wholesale or Investment
  - `status` (text) - Deal stage (lead, analyzing, under-contract, closed, dead)
  - `arv` (numeric) - After Repair Value
  - `ask_price` (numeric) - Asking price
  - `estimated_profit` (numeric) - Estimated profit
  - `repair_estimate` (numeric) - Estimated repair costs
  - `contact_id` (uuid, foreign key) - Related contact
  - `notes` (text) - Additional notes
  - `image_url` (text) - Property image URL
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `contacts`
  - `id` (uuid, primary key) - Unique contact identifier
  - `user_id` (uuid, foreign key) - Owner of the contact
  - `name` (text) - Contact name
  - `email` (text) - Email address
  - `phone` (text) - Phone number
  - `contact_type` (text) - Type (seller, buyer, agent, investor)
  - `notes` (text) - Additional notes
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Authenticated users required for all operations
*/

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  contact_type text DEFAULT 'seller',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  location text NOT NULL,
  property_type text DEFAULT 'single-family',
  deal_type text DEFAULT 'wholesale',
  status text DEFAULT 'lead',
  arv numeric DEFAULT 0,
  ask_price numeric DEFAULT 0,
  estimated_profit numeric DEFAULT 0,
  repair_estimate numeric DEFAULT 0,
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- Contacts policies
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Deals policies
CREATE POLICY "Users can view own deals"
  ON deals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deals"
  ON deals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own deals"
  ON deals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own deals"
  ON deals FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);