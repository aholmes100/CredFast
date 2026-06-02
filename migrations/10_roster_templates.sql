-- ================================================================
-- CredFast Roster Templates Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

CREATE TABLE IF NOT EXISTS roster_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  payer_id        uuid REFERENCES payers(id) ON DELETE SET NULL,
  name            text NOT NULL,
  file_path       text NOT NULL,
  file_name       text NOT NULL,
  sheet_name      text NOT NULL DEFAULT 'PractitionerFacility Add_Update',
  header_row      integer NOT NULL DEFAULT 1,
  column_mappings jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roster_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_roster_templates" ON roster_templates;

CREATE POLICY "org_roster_templates" ON roster_templates
  FOR ALL TO authenticated
  USING  (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_roster_templates_org ON roster_templates (organization_id);

-- ================================================================
-- STORAGE SETUP (manual steps in Supabase Dashboard)
-- ================================================================
--
-- 1. Go to Storage → New bucket
--    Name: rosters
--    Public: NO (private bucket)
--
-- 2. After creating the bucket, add a storage policy:
--    Dashboard → Storage → rosters bucket → Policies → New policy
--
--    Policy name:         org_rosters_storage
--    Allowed operations:  SELECT, INSERT, DELETE
--    Target roles:        authenticated
--    Policy expression:
--      (storage.foldername(name))[1] = (
--        SELECT organization_id::text FROM profiles WHERE id = auth.uid()
--      )
-- ================================================================
