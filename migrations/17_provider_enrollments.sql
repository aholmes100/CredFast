-- ================================================================
-- CredFast Migration 17: Provider enrollment tracking
-- Creates provider_payer_enrollments, enrollment_activity_log.
-- Links enrollment_applications to enrollments.
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 0. Add display_name to profiles so assigned_to can be shown
--    by name in the UI rather than raw UUID.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name text;


-- ────────────────────────────────────────────────────────────────
-- 1. provider_payer_enrollments
--    One row per provider/payer combination.
--    Tracks the overall enrollment relationship independently of
--    which application(s) were generated for it.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_payer_enrollments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        REFERENCES organizations(id),
  provider_id         uuid        NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  payer_id            uuid        NOT NULL REFERENCES payers(id)     ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'in_queue',
    -- in_queue | in_progress | enrolled | inactive
  next_action         text        NOT NULL DEFAULT 'none',
    -- follow_up | submit | awaiting_approval | none
  assigned_to         uuid        REFERENCES auth.users(id),
  next_follow_up_date date,
  submitted_at        timestamptz,
  approved_at         timestamptz,
  effective_date      date,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz,

  UNIQUE (provider_id, payer_id)
);


-- ────────────────────────────────────────────────────────────────
-- 2. enrollment_activity_log
--    Append-only timestamped notes on an enrollment.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollment_activity_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id   uuid        NOT NULL REFERENCES provider_payer_enrollments(id) ON DELETE CASCADE,
  organization_id uuid        REFERENCES organizations(id),
  author_id       uuid        REFERENCES auth.users(id),
  note            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────────
-- 3. Link enrollment_applications → provider_payer_enrollments
--    Nullable so all existing applications are unaffected.
--    New applications created from the enrollment detail page will
--    set this automatically.
-- ────────────────────────────────────────────────────────────────
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS enrollment_id uuid
    REFERENCES provider_payer_enrollments(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ────────────────────────────────────────────────────────────────
ALTER TABLE provider_payer_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_activity_log    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON provider_payer_enrollments;
DROP POLICY IF EXISTS "org_access" ON enrollment_activity_log;

-- Enrollment rows scoped to org
CREATE POLICY "org_access" ON provider_payer_enrollments
  FOR ALL
  USING      (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Activity log rows scoped to org
CREATE POLICY "org_access" ON enrollment_activity_log
  FOR ALL
  USING      (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ────────────────────────────────────────────────────────────────
-- 5. Indexes
-- ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ppe_provider
  ON provider_payer_enrollments (provider_id);

CREATE INDEX IF NOT EXISTS idx_ppe_payer
  ON provider_payer_enrollments (payer_id);

CREATE INDEX IF NOT EXISTS idx_ppe_org_status
  ON provider_payer_enrollments (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_eal_enrollment
  ON enrollment_activity_log (enrollment_id, created_at DESC);


-- ────────────────────────────────────────────────────────────────
-- BACKFILL NOTE
-- After running this migration, set organization_id on new rows
-- by including it in all INSERT statements from the UI (same as
-- every other core table). No backfill needed for existing data
-- since provider_payer_enrollments is a brand new table.
--
-- To manually set your display_name in profiles:
--   UPDATE profiles SET display_name = 'Your Name' WHERE id = auth.uid();
-- ────────────────────────────────────────────────────────────────
