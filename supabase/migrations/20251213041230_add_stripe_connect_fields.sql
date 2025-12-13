/*
  # Add Stripe Connect Integration Fields

  ## Overview
  This migration adds Stripe Connect fields to support direct charges with automatic platform fee collection.

  ## Changes to Tables

  ### user_profiles table
  - Add `stripe_connect_account_id` (text, nullable) - Stores the connected Stripe account ID for agents
  - Add `stripe_account_status` (text, default 'not_connected') - Tracks onboarding status
  - Add `stripe_charges_enabled` (boolean, default false) - Whether account can accept charges
  - Add `stripe_payouts_enabled` (boolean, default false) - Whether account can receive payouts

  ### payments table
  - Add `stripe_transfer_id` (text, nullable) - ID of the transfer to the connected account
  - Add `platform_fee_amount` (numeric, nullable) - Amount retained as platform fee
  - Add `net_amount` (numeric, nullable) - Amount transferred to agent after fees

  ## Security
  - No RLS changes needed, existing policies apply

  ## Important Notes
  1. Agents must complete Stripe Connect onboarding before accepting payments
  2. Platform fee is 0.5% of the transaction amount
  3. Stripe Connect uses direct charges model for automatic fee collection
*/

-- Add Stripe Connect fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_connect_account_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_connect_account_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_account_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_account_status text DEFAULT 'not_connected' CHECK (stripe_account_status IN ('not_connected', 'pending', 'active', 'restricted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_charges_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_charges_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_payouts_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_payouts_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add additional Stripe fields to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'stripe_transfer_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN stripe_transfer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'platform_fee_amount'
  ) THEN
    ALTER TABLE payments ADD COLUMN platform_fee_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE payments ADD COLUMN net_amount numeric;
  END IF;
END $$;

-- Create index for faster Stripe account lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_account ON user_profiles(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;