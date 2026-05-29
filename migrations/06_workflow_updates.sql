-- ================================================================
-- CredFast Workflow Updates Migration
-- Adds: priority + next_action to applications,
--       note_type + title to internal_notes,
--       application_activity_log table
-- Safe to re-run.
-- ================================================================

-- 1. Workflow fields on enrollment_applications
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS priority    text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS next_action text;

-- 2. Type + title on internal_notes
ALTER TABLE internal_notes
  ADD COLUMN IF NOT EXISTS note_type text NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS title     text;

-- 3. Activity log
CREATE TABLE IF NOT EXISTS application_activity_log (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_application_id uuid NOT NULL REFERENCES enrollment_applications(id) ON DELETE CASCADE,
  organization_id           uuid REFERENCES organizations(id),
  event_type                text NOT NULL,  -- status_change, task_added, task_completed, note_added, followup_logged, field_update
  field_name                text,
  old_value                 text,
  new_value                 text,
  summary                   text NOT NULL,
  performed_by              text,
  created_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE application_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON application_activity_log;
CREATE POLICY "org_access" ON application_activity_log
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_activity_application
  ON application_activity_log (enrollment_application_id, created_at DESC);
