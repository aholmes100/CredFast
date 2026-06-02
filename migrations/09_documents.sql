-- ================================================================
-- CredFast Document Storage Migration
-- Run in Supabase SQL Editor. Safe to re-run.
--
-- NOTE: If a 'documents' table already exists with a different schema
-- from a previous migration, you may need to run:
--   DROP TABLE IF EXISTS documents;
-- before running this migration (only if the existing table is empty).
-- ================================================================

CREATE TABLE IF NOT EXISTS documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id     uuid REFERENCES providers(id) ON DELETE CASCADE,
  name            text NOT NULL,
  type            text NOT NULL, -- 'license' | 'malpractice' | 'dea' | 'board_cert' | 'caqh' | 'other'
  file_path       text NOT NULL,
  file_size       integer,
  mime_type       text,
  expiration_date date,
  notes           text,
  uploaded_by     uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_documents" ON documents;

CREATE POLICY "org_documents" ON documents
  FOR ALL TO authenticated
  USING  (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_documents_provider ON documents (provider_id);
CREATE INDEX IF NOT EXISTS idx_documents_org      ON documents (organization_id, created_at DESC);

-- ================================================================
-- STORAGE SETUP (manual steps in Supabase Dashboard)
-- ================================================================
--
-- 1. Go to Storage → New bucket
--    Name: documents
--    Public: NO (private bucket)
--
-- 2. After creating the bucket, add a storage policy:
--    Dashboard → Storage → documents bucket → Policies → New policy
--
--    Policy name:         org_documents_storage
--    Allowed operations:  SELECT, INSERT, DELETE
--    Target roles:        authenticated
--    Policy expression:
--      (storage.foldername(name))[1] = (
--        SELECT organization_id::text FROM profiles WHERE id = auth.uid()
--      )
--
--    This ensures users can only access files in their own org's folder.
-- ================================================================
