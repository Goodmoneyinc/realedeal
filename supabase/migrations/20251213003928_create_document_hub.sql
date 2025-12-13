-- Create Document/E-Signature Hub
-- 
-- 1. New Tables
--    - documents: Core document records with metadata
--    - document_signatures: Track signature requests and status
--    - document_versions: Version history for documents
--    - document_shares: Share documents with specific users
--    
-- 2. Security
--    - Enable RLS on all tables
--    - Users can only access documents they own or are shared with
--    - Signature tracking for compliance

-- Create document types enum
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'contract',
    'disclosure',
    'inspection_report',
    'appraisal',
    'title_document',
    'closing_statement',
    'deed',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create document status enum
DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'draft',
    'pending_signature',
    'signed',
    'completed',
    'voided'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES transaction_pipeline(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  document_type document_type NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text,
  status document_status DEFAULT 'draft',
  requires_signature boolean DEFAULT false,
  docusign_envelope_id text,
  is_archived boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create document signatures table
CREATE TABLE IF NOT EXISTS document_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  signer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  signer_email text NOT NULL,
  signer_name text NOT NULL,
  signing_order int DEFAULT 1,
  status text DEFAULT 'pending',
  signed_at timestamptz,
  docusign_recipient_id text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Create document versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  change_notes text,
  created_at timestamptz DEFAULT now()
);

-- Create document shares table
CREATE TABLE IF NOT EXISTS document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  shared_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  permission text DEFAULT 'view',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create document activity log
CREATE TABLE IF NOT EXISTS document_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_pipeline ON documents(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_documents_deal ON documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer ON document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_document ON document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON document_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_document_activity_document ON document_activity(document_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;

-- Documents policies
DROP POLICY IF EXISTS "Users can view their documents" ON documents;
CREATE POLICY "Users can view their documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_shares.document_id = documents.id
      AND document_shares.shared_with = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM transaction_pipeline
      WHERE transaction_pipeline.id = documents.pipeline_id
      AND (
        transaction_pipeline.agent_id = auth.uid() OR
        transaction_pipeline.investor_id = auth.uid() OR
        transaction_pipeline.lender_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM deals
      WHERE deals.id = documents.deal_id
      AND deals.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create documents" ON documents;
CREATE POLICY "Users can create documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their documents" ON documents;
CREATE POLICY "Users can update their documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their documents" ON documents;
CREATE POLICY "Users can delete their documents"
  ON documents FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Document signatures policies
DROP POLICY IF EXISTS "Users can view signatures for their documents" ON document_signatures;
CREATE POLICY "Users can view signatures for their documents"
  ON document_signatures FOR SELECT
  TO authenticated
  USING (
    signer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_signatures.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Document owners can create signatures" ON document_signatures;
CREATE POLICY "Document owners can create signatures"
  ON document_signatures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_signatures.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their signature status" ON document_signatures;
CREATE POLICY "Users can update their signature status"
  ON document_signatures FOR UPDATE
  TO authenticated
  USING (
    signer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_signatures.document_id
      AND documents.uploaded_by = auth.uid()
    )
  )
  WITH CHECK (
    signer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_signatures.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Document versions policies
DROP POLICY IF EXISTS "Users can view versions of their documents" ON document_versions;
CREATE POLICY "Users can view versions of their documents"
  ON document_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
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

DROP POLICY IF EXISTS "Users can create versions for their documents" ON document_versions;
CREATE POLICY "Users can create versions for their documents"
  ON document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_versions.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Document shares policies
DROP POLICY IF EXISTS "Users can view shares for their documents" ON document_shares;
CREATE POLICY "Users can view shares for their documents"
  ON document_shares FOR SELECT
  TO authenticated
  USING (
    shared_with = auth.uid() OR
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_shares.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Document owners can share" ON document_shares;
CREATE POLICY "Document owners can share"
  ON document_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_shares.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can revoke shares" ON document_shares;
CREATE POLICY "Users can revoke shares"
  ON document_shares FOR DELETE
  TO authenticated
  USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_shares.document_id
      AND documents.uploaded_by = auth.uid()
    )
  );

-- Document activity policies
DROP POLICY IF EXISTS "Users can view activity for their documents" ON document_activity;
CREATE POLICY "Users can view activity for their documents"
  ON document_activity FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = document_activity.document_id
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

DROP POLICY IF EXISTS "Users can create activity logs" ON document_activity;
CREATE POLICY "Users can create activity logs"
  ON document_activity FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
