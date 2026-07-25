-- ================================================================
-- CredFast Migration 18: MedTrainer import support
-- Adds division_code to groups, creates provider_licenses and
-- provider_identifiers tables.
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- 1. groups — add division_code
-- ────────────────────────────────────────────────────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS division_code TEXT;


-- ────────────────────────────────────────────────────────────────
-- 2. provider_licenses
--    One row per state license. Matches ProviderLicense in
--    app/types/index.ts exactly.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_licenses (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id     uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  state           text        NOT NULL,
  license_number  text        NOT NULL,
  license_type    text        NOT NULL,
  status          text        NOT NULL,
  issue_date      date,
  expiration_date date,
  is_primary      boolean     NOT NULL DEFAULT false,
  verified_at     timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz
);

-- Defensive: ensure organization_id exists if table was created by an earlier attempt without it
ALTER TABLE provider_licenses
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE provider_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON provider_licenses;

CREATE POLICY "org_access" ON provider_licenses
  FOR ALL
  USING      (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pl_provider
  ON provider_licenses (provider_id);

CREATE INDEX IF NOT EXISTS idx_pl_org_state
  ON provider_licenses (organization_id, state);


-- ────────────────────────────────────────────────────────────────
-- 3. provider_identifiers
--    Multi-value store for Medicaid, Medicare, DEA, CDS, and
--    other state/payer-specific identifiers.
--    identifier_type: 'medicaid' | 'medicare' | 'dea' | 'cds' |
--                     'upin' | 'ecfmg' | 'usmle' | 'workers_comp'
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_identifiers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id      uuid        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  identifier_type  text        NOT NULL,
  state            text,
  identifier_value text        NOT NULL,
  expiration_date  date,
  is_primary       boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Defensive: ensure columns exist if table was created by an earlier attempt without them
ALTER TABLE provider_identifiers
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE provider_identifiers
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

ALTER TABLE provider_identifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON provider_identifiers;

CREATE POLICY "org_access" ON provider_identifiers
  FOR ALL
  USING      (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_pi_provider
  ON provider_identifiers (provider_id);

CREATE INDEX IF NOT EXISTS idx_pi_provider_type
  ON provider_identifiers (provider_id, identifier_type);
