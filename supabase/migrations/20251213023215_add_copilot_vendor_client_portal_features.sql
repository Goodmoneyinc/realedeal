/*
  # Add Co-Pilot, Vendor Management, and Client Portal Features

  ## New Tables
  
  ### 1. Vendors
    - Centralized vendor directory for agents
    - Categories: attorney, inspector, lender, contractor, title_company
    - Rating system and preferred vendor marking
  
  ### 2. Vendor Tasks
    - Assign tasks to vendors
    - Track completion and due dates
    - Link to transaction pipeline
  
  ### 3. Email Templates
    - Pre-built and custom email templates
    - Variable substitution support
    - Categories for different communication types
  
  ### 4. Scheduled Emails
    - Auto-schedule emails based on milestones
    - Track delivery status
    - Link to transactions
  
  ### 5. Transaction Milestones
    - Track major milestones in a transaction
    - Calculate progress percentage
    - Traffic light status system
  
  ### 6. Client Tasks
    - Agent-created to-do items for clients
    - Priority levels
    - Due date tracking
  
  ### 7. Document Annotations
    - Add notes to specific document pages
    - AI-generated summaries
    - Important clause highlighting

  ## Security
    - RLS enabled on all tables
    - Agents manage their vendors and templates
    - Clients can view their transaction data
    - Proper access control for shared documents
*/

-- Create vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  company text,
  email text,
  phone text,
  address text,
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_preferred boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create vendor_tasks table
CREATE TABLE IF NOT EXISTS vendor_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE NOT NULL,
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor tasks they assigned"
  ON vendor_tasks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = assigned_by OR
    EXISTS (SELECT 1 FROM vendors WHERE vendors.id = vendor_tasks.vendor_id AND vendors.user_id = auth.uid())
  );

CREATE POLICY "Users can create vendor tasks"
  ON vendor_tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can update vendor tasks they assigned"
  ON vendor_tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = assigned_by)
  WITH CHECK (auth.uid() = assigned_by);

CREATE POLICY "Users can delete vendor tasks they assigned"
  ON vendor_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = assigned_by);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('inspection', 'appraisal', 'closing', 'general', 'milestone', 'task')),
  subject text NOT NULL,
  body text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and system templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_system = true);

CREATE POLICY "Users can create own templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update own templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false)
  WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete own templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_system = false);

-- Insert system templates
INSERT INTO email_templates (name, category, subject, body, is_system) VALUES
  ('Inspection Scheduled', 'inspection', 'Property Inspection Scheduled - {{property_address}}', 'Hi {{client_name}},

Great news! Your property inspection has been scheduled for {{inspection_date}} at {{inspection_time}}.

**Property:** {{property_address}}
**Inspector:** {{inspector_name}}
**Company:** {{inspector_company}}

The inspection typically takes 2-3 hours. You''re welcome to attend, and I encourage you to do so if your schedule allows.

I''ll receive the report within 24-48 hours and will review it with you immediately.

Best regards,
{{agent_name}}', true),
  
  ('Appraisal Ordered', 'appraisal', 'Appraisal Ordered - {{property_address}}', 'Hi {{client_name}},

The appraisal for {{property_address}} has been ordered and scheduled for {{appraisal_date}}.

**What to expect:**
- The appraiser will inspect the property
- Report typically arrives within 7-10 days
- I''ll review the results with you immediately

**Your property is {{progress_percentage}}% through the transaction process.**

I''ll keep you updated on the appraisal results.

Best regards,
{{agent_name}}', true),
  
  ('Clear to Close', 'closing', 'Clear to Close! - {{property_address}}', 'Hi {{client_name}},

Congratulations! Your loan has been cleared to close!

**Closing Details:**
- Date: {{closing_date}}
- Time: {{closing_time}}
- Location: {{closing_location}}

We''re almost at the finish line. See you at closing!

Best regards,
{{agent_name}}', true),
  
  ('Task Reminder', 'task', 'Action Required: {{task_title}}', 'Hi {{client_name}},

This is a friendly reminder about a task that needs your attention:

**Task:** {{task_title}}
**Description:** {{task_description}}
**Due Date:** {{due_date}}
**Priority:** {{priority}}

Please complete this at your earliest convenience. Let me know if you have any questions.

Best regards,
{{agent_name}}', true),
  
  ('Milestone Complete', 'milestone', 'Progress Update: {{milestone_name}} Complete', 'Hi {{client_name}},

Great news! We''ve completed another important milestone:

**{{milestone_name}}**

**Your transaction is now {{progress_percentage}}% complete.**

You''re doing great! I''ll keep you updated on our progress.

Best regards,
{{agent_name}}', true)
ON CONFLICT DO NOTHING;

-- Create scheduled_emails table
CREATE TABLE IF NOT EXISTS scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled emails"
  ON scheduled_emails FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create scheduled emails"
  ON scheduled_emails FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own scheduled emails"
  ON scheduled_emails FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own scheduled emails"
  ON scheduled_emails FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create transaction_milestones table
CREATE TABLE IF NOT EXISTS transaction_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  order_index integer NOT NULL,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their transactions"
  ON transaction_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = transaction_milestones.pipeline_id
      AND (transaction_pipeline.agent_id = auth.uid() OR transaction_pipeline.investor_id = auth.uid() OR transaction_pipeline.lender_id = auth.uid())
    )
  );

CREATE POLICY "Agents can create milestones"
  ON transaction_milestones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update milestones"
  ON transaction_milestones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = transaction_milestones.pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = transaction_milestones.pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  );

CREATE POLICY "Agents can delete milestones"
  ON transaction_milestones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = transaction_milestones.pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  );

-- Create client_tasks table
CREATE TABLE IF NOT EXISTS client_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  due_date timestamptz,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks for their transactions"
  ON client_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = client_tasks.pipeline_id
      AND (transaction_pipeline.agent_id = auth.uid() OR transaction_pipeline.investor_id = auth.uid() OR transaction_pipeline.lender_id = auth.uid())
    )
  );

CREATE POLICY "Agents can create client tasks"
  ON client_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = pipeline_id
      AND transaction_pipeline.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks for their transactions"
  ON client_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = client_tasks.pipeline_id
      AND (transaction_pipeline.agent_id = auth.uid() OR transaction_pipeline.investor_id = auth.uid() OR transaction_pipeline.lender_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = client_tasks.pipeline_id
      AND (transaction_pipeline.agent_id = auth.uid() OR transaction_pipeline.investor_id = auth.uid() OR transaction_pipeline.lender_id = auth.uid())
    )
  );

CREATE POLICY "Agents can delete client tasks"
  ON client_tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create document_annotations table
CREATE TABLE IF NOT EXISTS document_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_number integer,
  note text,
  ai_summary text,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations on accessible documents"
  ON document_annotations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_annotations.document_id
      AND (
        documents.uploaded_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM document_shares
          WHERE document_shares.document_id = documents.id
          AND document_shares.shared_with = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create annotations"
  ON document_annotations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_id
      AND (
        documents.uploaded_by = auth.uid() OR
        EXISTS (
          SELECT 1 FROM document_shares
          WHERE document_shares.document_id = documents.id
          AND document_shares.shared_with = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update own annotations"
  ON document_annotations FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own annotations"
  ON document_annotations FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_vendor_id ON vendor_tasks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_pipeline_id ON vendor_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tasks_status ON vendor_tasks(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_pipeline_id ON scheduled_emails(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_transaction_milestones_pipeline_id ON transaction_milestones(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_transaction_milestones_status ON transaction_milestones(status);
CREATE INDEX IF NOT EXISTS idx_client_tasks_pipeline_id ON client_tasks(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_status ON client_tasks(status);
CREATE INDEX IF NOT EXISTS idx_document_annotations_document_id ON document_annotations(document_id);
