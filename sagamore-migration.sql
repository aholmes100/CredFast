-- ============================================================
-- Sagamore Gap Migration
-- Adds fields identified from the Sagamore Provider Data Sheet
-- Run this against your Supabase project SQL editor
-- ============================================================

-- ── Providers: identity / contact ────────────────────────────────────────────
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS middle_name         text,
  ADD COLUMN IF NOT EXISTS credential_suffix   text,        -- MD, DO, NP, PA, etc.
  ADD COLUMN IF NOT EXISTS phone               text,        -- provider direct phone
  ADD COLUMN IF NOT EXISTS ssn                 text,        -- full SSN (store securely)
  ADD COLUMN IF NOT EXISTS provider_tax_id     text;        -- individual SSN/EIN for 1099/billing (distinct from group EIN)

-- ── Providers: practice details ──────────────────────────────────────────────
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS secondary_specialty text,
  ADD COLUMN IF NOT EXISTS is_pcp              boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS languages           text,        -- free-text: "English, Spanish"
  ADD COLUMN IF NOT EXISTS hospital_affiliation text;       -- primary hospital affiliation name

-- ── Groups: credentialing contact ────────────────────────────────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS credentialing_contact_name  text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_email text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_phone text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_fax   text;

-- ── Groups: billing address (may differ from service address) ─────────────────
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS billing_name      text,       -- billing entity name if different from group name
  ADD COLUMN IF NOT EXISTS billing_address_1 text,
  ADD COLUMN IF NOT EXISTS billing_address_2 text,
  ADD COLUMN IF NOT EXISTS billing_city      text,
  ADD COLUMN IF NOT EXISTS billing_state     text,
  ADD COLUMN IF NOT EXISTS billing_zip       text,
  ADD COLUMN IF NOT EXISTS billing_phone     text,
  ADD COLUMN IF NOT EXISTS billing_fax       text;

-- ── Payers: additional contact fields ───────────────────────────────────────
ALTER TABLE payers
  ADD COLUMN IF NOT EXISTS enrollment_fax  text,
  ADD COLUMN IF NOT EXISTS enrollment_url  text;

-- ── Locations: mailing address (may differ from service/physical address) ──────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS mailing_address_1 text,
  ADD COLUMN IF NOT EXISTS mailing_address_2 text,
  ADD COLUMN IF NOT EXISTS mailing_city      text,
  ADD COLUMN IF NOT EXISTS mailing_state     text,
  ADD COLUMN IF NOT EXISTS mailing_zip       text;
