-- ================================================================
-- CredFast Provider Fields Migration
-- Adds medicaid_state and provider-level credentialing contact fields.
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS medicaid_state                text,          -- state that issued the Medicaid ID
  ADD COLUMN IF NOT EXISTS credentialing_contact_name   text,          -- contact specific to this provider, if different from group
  ADD COLUMN IF NOT EXISTS credentialing_contact_email  text,
  ADD COLUMN IF NOT EXISTS credentialing_contact_phone  text;
