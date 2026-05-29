-- ================================================================
-- CredFast Phase 2 Migration: Workflow tables
-- application_tasks, internal_notes, follow_up_log
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

-- 1. application_tasks
CREATE TABLE IF NOT EXISTS application_tasks (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_application_id uuid NOT NULL REFERENCES enrollment_applications(id) ON DELETE CASCADE,
  organization_id          uuid REFERENCES organizations(id),
  title                    text NOT NULL,
  task_type                text NOT NULL DEFAULT 'general',
  assigned_to              text,
  due_date                 date,
  is_completed             boolean NOT NULL DEFAULT false,
  completed_at             timestamptz,
  sort_order               integer NOT NULL DEFAULT 0,
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- 2. internal_notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  entity_type     text NOT NULL,   -- 'application', 'provider', etc.
  entity_id       uuid NOT NULL,
  note            text NOT NULL,
  is_pinned       boolean NOT NULL DEFAULT false,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. follow_up_log
CREATE TABLE IF NOT EXISTS follow_up_log (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_application_id uuid NOT NULL REFERENCES enrollment_applications(id) ON DELETE CASCADE,
  organization_id          uuid REFERENCES organizations(id),
  contact_method           text NOT NULL,   -- phone, email, fax, portal, mail
  contact_name             text,
  summary                  text NOT NULL,
  outcome                  text,
  follow_up_required       boolean NOT NULL DEFAULT false,
  follow_up_date           date,
  logged_at                timestamptz NOT NULL DEFAULT now(),
  logged_by                text
);

-- 4. Enable RLS
ALTER TABLE application_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_log     ENABLE ROW LEVEL SECURITY;

-- 5. Drop policies (safe re-run)
DROP POLICY IF EXISTS "org_access" ON application_tasks;
DROP POLICY IF EXISTS "org_access" ON internal_notes;
DROP POLICY IF EXISTS "org_access" ON follow_up_log;

-- 6. RLS policies — org isolation matching existing tables
CREATE POLICY "org_access" ON application_tasks
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON internal_notes
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON follow_up_log
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 7. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_application    ON application_tasks (enrollment_application_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity         ON internal_notes (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_followup_application ON follow_up_log (enrollment_application_id);
