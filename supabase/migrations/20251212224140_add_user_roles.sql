/*
  # Add User Roles System

  ## Overview
  Creates a user profiles system to support three distinct user roles in the real estate CRM:
  - Agent/Wholesaler: Posts and manages property deals
  - Investor: Views and expresses interest in deals
  - Lender: Provides financing options for deals

  ## New Tables

  ### `user_profiles`
  - `id` (uuid, primary key) - Matches auth.users id
  - `role` (text) - User role: 'agent', 'investor', or 'lender'
  - `full_name` (text) - User's full name
  - `company_name` (text) - Company/organization name (optional)
  - `phone` (text) - Phone number (optional)
  - `bio` (text) - User biography/description (optional)
  - `avatar_url` (text) - Profile picture URL (optional)
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Security
  - Enable RLS on user_profiles table
  - All authenticated users can view any profile (for collaboration)
  - Users can only update their own profile
  - Profile is automatically created when user signs up

  ## Changes to Existing Tables
  - No breaking changes to existing deals or contacts tables
  - Future migrations will add role-based visibility controls
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('agent', 'investor', 'lender')),
  full_name text NOT NULL,
  company_name text,
  phone text,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Anyone can view user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'role', 'agent')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();