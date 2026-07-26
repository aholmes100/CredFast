-- Provider degree (academic degree, distinct from credential_suffix)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS degree TEXT;

-- Location roster fields
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS website          TEXT,
  ADD COLUMN IF NOT EXISTS laboratory       TEXT,
  ADD COLUMN IF NOT EXISTS panel_limits     TEXT,
  ADD COLUMN IF NOT EXISTS age_limits       TEXT,
  ADD COLUMN IF NOT EXISTS office_languages TEXT;

-- Provider type per enrollment (PCP, SPEC, Hospitalist, FQHC-PCP, etc.)
ALTER TABLE provider_payer_enrollments
  ADD COLUMN IF NOT EXISTS provider_type TEXT;
