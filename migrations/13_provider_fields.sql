-- ================================================================
-- CredFast Provider Fields + Location Office Hours Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

-- New provider fields (all safe to re-run with IF NOT EXISTS)
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS ssn                         text,
  ADD COLUMN IF NOT EXISTS email                       text,
  ADD COLUMN IF NOT EXISTS medicaid_number             text,
  ADD COLUMN IF NOT EXISTS medicaid_state              text,
  ADD COLUMN IF NOT EXISTS medicare_number             text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_name  text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_email text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_phone text;

-- Per-day office hours on locations
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS hours_monday    text,
  ADD COLUMN IF NOT EXISTS hours_tuesday   text,
  ADD COLUMN IF NOT EXISTS hours_wednesday text,
  ADD COLUMN IF NOT EXISTS hours_thursday  text,
  ADD COLUMN IF NOT EXISTS hours_friday    text,
  ADD COLUMN IF NOT EXISTS hours_saturday  text,
  ADD COLUMN IF NOT EXISTS hours_sunday    text;
