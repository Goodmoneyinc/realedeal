/*
  # Create Financing Options for Lenders

  1. New Tables
    - `financing_proposals`
      - `id` (uuid, primary key)
      - `deal_id` (uuid, references deals)
      - `lender_id` (uuid, references auth.users)
      - `loan_amount` (numeric)
      - `interest_rate` (numeric)
      - `loan_term_months` (integer)
      - `down_payment_required` (numeric)
      - `closing_costs` (numeric)
      - `loan_type` (text) - e.g., 'conventional', 'hard-money', 'bridge', 'commercial'
      - `notes` (text)
      - `status` (text) - 'draft', 'sent', 'accepted', 'rejected', 'expired'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `expires_at` (timestamptz)

  2. Security
    - Enable RLS on `financing_proposals` table
    - Lenders can create and view their own proposals
    - Deal owners (agents) can view proposals for their deals
    - Lenders can update their own proposals
    - Deal owners can update proposal status (accept/reject)
*/

-- Create financing proposals table
CREATE TABLE IF NOT EXISTS financing_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  lender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  loan_amount numeric NOT NULL,
  interest_rate numeric NOT NULL,
  loan_term_months integer NOT NULL,
  down_payment_required numeric DEFAULT 0,
  closing_costs numeric DEFAULT 0,
  loan_type text NOT NULL DEFAULT 'conventional',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT valid_loan_type CHECK (loan_type IN ('conventional', 'hard-money', 'bridge', 'commercial', 'portfolio', 'sba', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'))
);

-- Enable RLS
ALTER TABLE financing_proposals ENABLE ROW LEVEL SECURITY;

-- Lenders can view their own proposals
CREATE POLICY "Lenders can view own proposals"
  ON financing_proposals
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = lender_id
    OR 
    auth.uid() IN (
      SELECT user_id FROM deals WHERE id = financing_proposals.deal_id
    )
  );

-- Lenders can create proposals
CREATE POLICY "Lenders can create proposals"
  ON financing_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = lender_id
    AND
    EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'lender'
    )
  );

-- Lenders can update their own proposals
CREATE POLICY "Lenders can update own proposals"
  ON financing_proposals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = lender_id)
  WITH CHECK (auth.uid() = lender_id);

-- Deal owners can update proposal status
CREATE POLICY "Deal owners can update proposal status"
  ON financing_proposals
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM deals WHERE id = financing_proposals.deal_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM deals WHERE id = financing_proposals.deal_id
    )
  );

-- Lenders can delete their own draft proposals
CREATE POLICY "Lenders can delete own draft proposals"
  ON financing_proposals
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = lender_id 
    AND status = 'draft'
  );

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_financing_proposals_deal_id ON financing_proposals(deal_id);
CREATE INDEX IF NOT EXISTS idx_financing_proposals_lender_id ON financing_proposals(lender_id);
CREATE INDEX IF NOT EXISTS idx_financing_proposals_status ON financing_proposals(status);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_financing_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financing_proposals_updated_at
  BEFORE UPDATE ON financing_proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_financing_proposals_updated_at();
