/*
  # Add Role-Specific Features for Real Estate CRM

  ## New Tables
  
  ### 1. agent_investor_assignments
  - Links agents with their assigned investors
  - `id` (uuid, primary key)
  - `agent_id` (uuid, references user_profiles)
  - `investor_id` (uuid, references user_profiles)
  - `created_at` (timestamptz)
  
  ### 2. deal_actions
  - Tracks investor responses to deals
  - `id` (uuid, primary key)
  - `deal_id` (uuid, references deals)
  - `investor_id` (uuid, references user_profiles)
  - `action_type` (text: 'interested', 'declined', 'contract_signed')
  - `decline_reason` (text, nullable)
  - `earnest_money_amount` (numeric, nullable)
  - `earnest_money_paid` (boolean, default false)
  - `contract_signed_at` (timestamptz, nullable)
  - `created_at` (timestamptz)
  
  ### 3. lender_referrals
  - Tracks when investors refer deals to lenders
  - `id` (uuid, primary key)
  - `deal_id` (uuid, references deals)
  - `investor_id` (uuid, references user_profiles)
  - `lender_id` (uuid, references user_profiles)
  - `status` (text: 'pending', 'reviewed', 'term_sheet_generated')
  - `notes` (text, nullable)
  - `created_at` (timestamptz)
  
  ### 4. term_sheets
  - Lender-generated financing terms
  - `id` (uuid, primary key)
  - `referral_id` (uuid, references lender_referrals)
  - `lender_id` (uuid, references user_profiles)
  - `loan_amount` (numeric)
  - `interest_rate` (numeric)
  - `loan_term_months` (integer)
  - `down_payment_required` (numeric)
  - `closing_costs` (numeric)
  - `monthly_payment` (numeric)
  - `terms_details` (text)
  - `created_at` (timestamptz)
  
  ### 5. transactions
  - Payment tracking for fees and earnest money
  - `id` (uuid, primary key)
  - `deal_id` (uuid, references deals)
  - `transaction_type` (text: 'earnest_money', 'commission_fee')
  - `amount` (numeric)
  - `status` (text: 'pending', 'completed', 'failed')
  - `stripe_payment_id` (text, nullable)
  - `payer_id` (uuid, references user_profiles)
  - `recipient_id` (uuid, references user_profiles, nullable)
  - `created_at` (timestamptz)
  
  ## Table Modifications
  
  ### deals table
  - Add `zoning` (text)
  - Add `rental_potential` (numeric)
  - Add `commission_fee` (numeric, default 0)
  - Add `commission_paid` (boolean, default false)
  
  ## Security
  - Enable RLS on all new tables
  - Add policies for role-based access
*/

-- Add new columns to deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'zoning'
  ) THEN
    ALTER TABLE deals ADD COLUMN zoning text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'rental_potential'
  ) THEN
    ALTER TABLE deals ADD COLUMN rental_potential numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'commission_fee'
  ) THEN
    ALTER TABLE deals ADD COLUMN commission_fee numeric DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'commission_paid'
  ) THEN
    ALTER TABLE deals ADD COLUMN commission_paid boolean DEFAULT false;
  END IF;
END $$;

-- Create agent_investor_assignments table
CREATE TABLE IF NOT EXISTS agent_investor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, investor_id)
);

ALTER TABLE agent_investor_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view their investor assignments"
  ON agent_investor_assignments FOR SELECT
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'agent')
  );

CREATE POLICY "Investors can view their agent assignments"
  ON agent_investor_assignments FOR SELECT
  TO authenticated
  USING (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "Agents can create investor assignments"
  ON agent_investor_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'agent')
  );

CREATE POLICY "Agents can delete their investor assignments"
  ON agent_investor_assignments FOR DELETE
  TO authenticated
  USING (
    agent_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'agent')
  );

-- Create deal_actions table
CREATE TABLE IF NOT EXISTS deal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('interested', 'declined', 'contract_signed')),
  decline_reason text,
  earnest_money_amount numeric DEFAULT 0,
  earnest_money_paid boolean DEFAULT false,
  contract_signed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(deal_id, investor_id)
);

ALTER TABLE deal_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view their own deal actions"
  ON deal_actions FOR SELECT
  TO authenticated
  USING (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "Agents can view deal actions for their deals"
  ON deal_actions FOR SELECT
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

CREATE POLICY "Investors can create their own deal actions"
  ON deal_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "Investors can update their own deal actions"
  ON deal_actions FOR UPDATE
  TO authenticated
  USING (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  )
  WITH CHECK (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

-- Create lender_referrals table
CREATE TABLE IF NOT EXISTS lender_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  lender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'term_sheet_generated')),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lender_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investors can view their referrals"
  ON lender_referrals FOR SELECT
  TO authenticated
  USING (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "Lenders can view referrals sent to them"
  ON lender_referrals FOR SELECT
  TO authenticated
  USING (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  );

CREATE POLICY "Agents can view referrals for their deals"
  ON lender_referrals FOR SELECT
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

CREATE POLICY "Investors can create lender referrals"
  ON lender_referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    investor_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'investor')
  );

CREATE POLICY "Lenders can update referral status"
  ON lender_referrals FOR UPDATE
  TO authenticated
  USING (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  )
  WITH CHECK (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  );

-- Create term_sheets table
CREATE TABLE IF NOT EXISTS term_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id uuid NOT NULL REFERENCES lender_referrals(id) ON DELETE CASCADE,
  lender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  loan_amount numeric NOT NULL,
  interest_rate numeric NOT NULL,
  loan_term_months integer NOT NULL,
  down_payment_required numeric DEFAULT 0,
  closing_costs numeric DEFAULT 0,
  monthly_payment numeric NOT NULL,
  terms_details text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE term_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lenders can view their term sheets"
  ON term_sheets FOR SELECT
  TO authenticated
  USING (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  );

CREATE POLICY "Investors can view term sheets for their referrals"
  ON term_sheets FOR SELECT
  TO authenticated
  USING (
    referral_id IN (
      SELECT id FROM lender_referrals WHERE investor_id = auth.uid()
    )
  );

CREATE POLICY "Agents can view term sheets for their deals"
  ON term_sheets FOR SELECT
  TO authenticated
  USING (
    referral_id IN (
      SELECT lr.id FROM lender_referrals lr
      JOIN deals d ON d.id = lr.deal_id
      WHERE d.user_id = auth.uid()
    )
  );

CREATE POLICY "Lenders can create their term sheets"
  ON term_sheets FOR INSERT
  TO authenticated
  WITH CHECK (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  );

CREATE POLICY "Lenders can update their term sheets"
  ON term_sheets FOR UPDATE
  TO authenticated
  USING (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  )
  WITH CHECK (
    lender_id IN (SELECT id FROM user_profiles WHERE id = auth.uid() AND role = 'lender')
  );

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earnest_money', 'commission_fee')),
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_id text,
  payer_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    payer_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "Agents can view transactions for their deals"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create transactions they are paying for"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    payer_id = auth.uid()
  );

CREATE POLICY "System can update transaction status"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    payer_id = auth.uid() OR recipient_id = auth.uid() OR
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  )
  WITH CHECK (
    payer_id = auth.uid() OR recipient_id = auth.uid() OR
    deal_id IN (SELECT id FROM deals WHERE user_id = auth.uid())
  );
