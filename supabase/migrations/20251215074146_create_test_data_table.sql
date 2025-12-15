/*
  # Create test_data table

  1. New Tables
    - `test_data`
      - `id` (uuid, primary key) - Unique identifier for each record
      - `message` (text) - Text message field
      - `created_at` (timestamptz) - Timestamp when record was created
      - `user_id` (uuid) - Reference to the user who created the record

  2. Security
    - Enable RLS on `test_data` table
    - Add policy for authenticated users to read all records
    - Add policy for authenticated users to insert their own records
    - Add policy for authenticated users to update their own records
    - Add policy for authenticated users to delete their own records
*/

CREATE TABLE IF NOT EXISTS test_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all test data"
  ON test_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own test data"
  ON test_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test data"
  ON test_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own test data"
  ON test_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
