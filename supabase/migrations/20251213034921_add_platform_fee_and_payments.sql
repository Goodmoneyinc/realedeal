/*
  # Add Platform Fee and Payment System

  ## Overview
  This migration adds automatic 0.5% platform fee tracking for closed deals and a comprehensive payment system for investors.

  ## New Tables
  
  ### 1. payments
  - Comprehensive payment tracking for all transaction types
  - `id` (uuid, primary key)
  - `deal_id` (uuid, references deals)
  - `payer_id` (uuid, references user_profiles) - User making the payment
  - `recipient_id` (uuid, references user_profiles, nullable) - User receiving payment (null for platform fees)
  - `payment_type` (text) - 'earnest_money', 'platform_fee', 'commission', 'closing_cost'
  - `amount` (numeric) - Payment amount in dollars
  - `status` (text) - 'pending', 'processing', 'completed', 'failed', 'refunded'
  - `stripe_payment_intent_id` (text, nullable) - Stripe payment reference
  - `stripe_charge_id` (text, nullable) - Stripe charge reference
  - `payment_method` (text, nullable) - Payment method used
  - `failure_reason` (text, nullable) - Reason if payment failed
  - `metadata` (jsonb, default '{}') - Additional payment data
  - `paid_at` (timestamptz, nullable) - When payment was completed
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### 2. deal_contracts
  - Track contracts associated with deals
  - `id` (uuid, primary key)
  - `deal_id` (uuid, references deals)
  - `document_id` (uuid, references documents)
  - `investor_id` (uuid, references user_profiles)
  - `contract_type` (text) - 'purchase_agreement', 'earnest_money', 'disclosure', 'other'
  - `status` (text) - 'draft', 'pending_signature', 'signed', 'executed', 'cancelled'
  - `docusign_envelope_id` (text, nullable)
  - `signed_at` (timestamptz, nullable)
  - `executed_at` (timestamptz, nullable)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ## Table Modifications
  
  ### deals table
  - Add `sale_price` (numeric) - Final sale price of the deal
  - Add `platform_fee_percentage` (numeric, default 0.005) - 0.5% platform fee
  - Add `platform_fee_amount` (numeric) - Calculated platform fee
  - Add `platform_fee_status` (text, default 'pending') - 'pending', 'paid', 'waived'
  - Add `earnest_money_required` (numeric, default 0) - Required earnest money amount
  - Add `earnest_money_status` (text, default 'pending') - 'pending', 'partial', 'paid'
  - Add `closed_at` (timestamptz, nullable) - When deal was closed

  ## Security
  - Enable RLS on all new tables
  - Agents and admins can view all payments
  - Investors can view their own payments
  - Only authenticated users can create payments
  - Contracts follow similar access patterns

  ## Important Notes
  1. Platform fee is automatically calculated as 0.5% of sale_price when deal closes
  2. Payment tracking supports multiple payment types for comprehensive financial management
  3. Contract tracking integrates with existing DocuSign functionality
  4. All monetary amounts stored in USD
*/

-- Add new columns to deals table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE deals ADD COLUMN sale_price numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'platform_fee_percentage'
  ) THEN
    ALTER TABLE deals ADD COLUMN platform_fee_percentage numeric DEFAULT 0.005;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'platform_fee_amount'
  ) THEN
    ALTER TABLE deals ADD COLUMN platform_fee_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'platform_fee_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN platform_fee_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'earnest_money_required'
  ) THEN
    ALTER TABLE deals ADD COLUMN earnest_money_required numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'earnest_money_status'
  ) THEN
    ALTER TABLE deals ADD COLUMN earnest_money_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'deals' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE deals ADD COLUMN closed_at timestamptz;
  END IF;
END $$;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  payer_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('earnest_money', 'platform_fee', 'commission', 'closing_cost')),
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  stripe_charge_id text,
  payment_method text,
  failure_reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create deal_contracts table
CREATE TABLE IF NOT EXISTS deal_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  investor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  contract_type text NOT NULL CHECK (contract_type IN ('purchase_agreement', 'earnest_money', 'disclosure', 'other')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'executed', 'cancelled')),
  docusign_envelope_id text,
  signed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create function to automatically calculate platform fee when deal closes
CREATE OR REPLACE FUNCTION calculate_platform_fee()
RETURNS TRIGGER AS $$
BEGIN
  -- If deal status changed to 'closed' and sale_price is set
  IF NEW.status = 'closed' AND OLD.status != 'closed' AND NEW.sale_price > 0 THEN
    -- Calculate 0.5% platform fee
    NEW.platform_fee_amount := NEW.sale_price * NEW.platform_fee_percentage;
    NEW.closed_at := now();
    
    -- Create a pending payment record for the platform fee
    INSERT INTO payments (
      deal_id,
      payer_id,
      payment_type,
      amount,
      status,
      metadata
    ) VALUES (
      NEW.id,
      NEW.agent_id,
      'platform_fee',
      NEW.platform_fee_amount,
      'pending',
      jsonb_build_object(
        'sale_price', NEW.sale_price,
        'fee_percentage', NEW.platform_fee_percentage,
        'auto_created', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic platform fee calculation
DROP TRIGGER IF EXISTS trigger_calculate_platform_fee ON deals;
CREATE TRIGGER trigger_calculate_platform_fee
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION calculate_platform_fee();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_deal_contracts_updated_at ON deal_contracts;
CREATE TRIGGER update_deal_contracts_updated_at
  BEFORE UPDATE ON deal_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payments

-- Agents and admins can view all payments
CREATE POLICY "Agents and admins can view all payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('agent', 'admin')
    )
  );

-- Investors can view their own payments
CREATE POLICY "Investors can view their own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

-- Authenticated users can create payments
CREATE POLICY "Authenticated users can create payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (payer_id = auth.uid());

-- Agents and admins can update payment status
CREATE POLICY "Agents and admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('agent', 'admin')
    )
  );

-- RLS Policies for deal_contracts

-- Agents and admins can view all contracts
CREATE POLICY "Agents and admins can view all contracts"
  ON deal_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('agent', 'admin')
    )
  );

-- Investors can view their own contracts
CREATE POLICY "Investors can view their own contracts"
  ON deal_contracts FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

-- Agents can create contracts
CREATE POLICY "Agents can create contracts"
  ON deal_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('agent', 'admin')
    )
  );

-- Agents and contract owners can update contracts
CREATE POLICY "Agents and owners can update contracts"
  ON deal_contracts FOR UPDATE
  TO authenticated
  USING (
    investor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('agent', 'admin')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_deal_id ON payments(deal_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_deal_contracts_deal_id ON deal_contracts(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_contracts_investor_id ON deal_contracts(investor_id);
CREATE INDEX IF NOT EXISTS idx_deal_contracts_status ON deal_contracts(status);