-- Create Transaction Pipeline Management System
-- Tables for managing property transaction stages and compliance

-- Create transaction stages enum
DO $$ BEGIN
  CREATE TYPE transaction_stage AS ENUM ('listing', 'contract', 'inspection', 'appraisal', 'close', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create transaction pipeline table
CREATE TABLE IF NOT EXISTS transaction_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  investor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  lender_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  property_address text NOT NULL,
  transaction_type text NOT NULL DEFAULT 'purchase',
  purchase_price numeric(12,2) DEFAULT 0,
  current_stage transaction_stage DEFAULT 'listing',
  stage_order int DEFAULT 0,
  estimated_close_date date,
  actual_close_date date,
  state text NOT NULL,
  brokerage text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create compliance checklists table
CREATE TABLE IF NOT EXISTS compliance_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  brokerage text,
  stage transaction_stage NOT NULL,
  checklist_name text NOT NULL,
  description text,
  is_required boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create pipeline checklist items table
CREATE TABLE IF NOT EXISTS pipeline_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE,
  compliance_checklist_id uuid REFERENCES compliance_checklists(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  stage transaction_stage NOT NULL,
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  due_date date,
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now()
);

-- Create pipeline notes table
CREATE TABLE IF NOT EXISTS pipeline_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  note text NOT NULL,
  note_type text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_agent ON transaction_pipeline(agent_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_deal ON transaction_pipeline(deal_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON transaction_pipeline(current_stage);
CREATE INDEX IF NOT EXISTS idx_pipeline_checklist_items ON pipeline_checklist_items(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_notes ON pipeline_notes(pipeline_id);

-- Insert default compliance checklists
INSERT INTO compliance_checklists (state, stage, checklist_name, description, is_required) VALUES
('CA', 'listing', 'Seller Disclosure Statement', 'Complete and provide Transfer Disclosure Statement (TDS)', true),
('CA', 'listing', 'Natural Hazard Disclosure', 'Provide Natural Hazard Disclosure Statement', true),
('CA', 'contract', 'Purchase Agreement Review', 'Review and execute California Residential Purchase Agreement', true),
('CA', 'contract', 'Deposit Receipt', 'Verify earnest money deposit received', true),
('CA', 'inspection', 'Property Inspection', 'Schedule and complete property inspection', true),
('CA', 'inspection', 'Pest Inspection', 'Complete Wood Destroying Pest Inspection Report', true),
('CA', 'appraisal', 'Appraisal Ordered', 'Order property appraisal from licensed appraiser', true),
('CA', 'appraisal', 'Appraisal Review', 'Review appraisal report with parties', true),
('CA', 'close', 'Final Walkthrough', 'Complete final property walkthrough', true),
('CA', 'close', 'Closing Documents', 'Sign all closing documents and transfer funds', true),
('TX', 'listing', 'Seller Disclosure Notice', 'Complete Texas Seller Disclosure Notice', true),
('TX', 'contract', 'Purchase Contract', 'Execute TREC 1-4 Family Residential Contract', true),
('TX', 'contract', 'Option Fee', 'Verify option fee payment received', true),
('TX', 'inspection', 'Property Inspection', 'Complete property inspection during option period', true),
('TX', 'appraisal', 'Appraisal Ordered', 'Order property appraisal', true),
('TX', 'close', 'Title Commitment Review', 'Review title commitment', true),
('TX', 'close', 'Final Settlement', 'Complete closing at title company', true),
('FL', 'listing', 'Property Disclosure', 'Complete Florida property disclosure form', true),
('FL', 'contract', 'Purchase Agreement', 'Execute Florida Residential Contract for Sale and Purchase', true),
('FL', 'inspection', 'Property Inspection', 'Complete property inspection', true),
('FL', 'inspection', 'Wind Mitigation', 'Complete wind mitigation inspection if applicable', true),
('FL', 'appraisal', 'Appraisal Ordered', 'Order property appraisal', true),
('FL', 'close', 'Final Walkthrough', 'Complete final walkthrough', true),
('FL', 'close', 'Closing', 'Complete closing and record deed', true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE transaction_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_notes ENABLE ROW LEVEL SECURITY;

-- Transaction pipeline policies
DROP POLICY IF EXISTS "Users can view their pipeline transactions" ON transaction_pipeline;
CREATE POLICY "Users can view their pipeline transactions"
  ON transaction_pipeline FOR SELECT
  TO authenticated
  USING (
    agent_id = auth.uid() OR
    investor_id = auth.uid() OR
    lender_id = auth.uid()
  );

DROP POLICY IF EXISTS "Agents can create pipeline transactions" ON transaction_pipeline;
CREATE POLICY "Agents can create pipeline transactions"
  ON transaction_pipeline FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

DROP POLICY IF EXISTS "Agents can update their pipeline transactions" ON transaction_pipeline;
CREATE POLICY "Agents can update their pipeline transactions"
  ON transaction_pipeline FOR UPDATE
  TO authenticated
  USING (agent_id = auth.uid())
  WITH CHECK (agent_id = auth.uid());

DROP POLICY IF EXISTS "Agents can delete their pipeline transactions" ON transaction_pipeline;
CREATE POLICY "Agents can delete their pipeline transactions"
  ON transaction_pipeline FOR DELETE
  TO authenticated
  USING (agent_id = auth.uid());

-- Compliance checklists policies
DROP POLICY IF EXISTS "Anyone can view compliance checklists" ON compliance_checklists;
CREATE POLICY "Anyone can view compliance checklists"
  ON compliance_checklists FOR SELECT
  TO authenticated
  USING (true);

-- Pipeline checklist items policies
DROP POLICY IF EXISTS "Users can view their checklist items" ON pipeline_checklist_items;
CREATE POLICY "Users can view their checklist items"
  ON pipeline_checklist_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_checklist_items.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Agents can create checklist items" ON pipeline_checklist_items;
CREATE POLICY "Agents can create checklist items"
  ON pipeline_checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_checklist_items.pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their checklist items" ON pipeline_checklist_items;
CREATE POLICY "Users can update their checklist items"
  ON pipeline_checklist_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_checklist_items.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_checklist_items.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    )
  );

-- Pipeline notes policies
DROP POLICY IF EXISTS "Users can view their pipeline notes" ON pipeline_notes;
CREATE POLICY "Users can view their pipeline notes"
  ON pipeline_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_notes.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can create pipeline notes" ON pipeline_notes;
CREATE POLICY "Users can create pipeline notes"
  ON pipeline_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_notes.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    )
  );
