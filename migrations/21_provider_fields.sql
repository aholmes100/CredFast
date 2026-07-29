-- Provider home address, employment info, and SSN last-4
-- credentialing_contact_name/email/phone already added in migration 13.
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS ssn_last4        TEXT,
  ADD COLUMN IF NOT EXISTS home_address_1   TEXT,
  ADD COLUMN IF NOT EXISTS home_address_2   TEXT,
  ADD COLUMN IF NOT EXISTS home_city        TEXT,
  ADD COLUMN IF NOT EXISTS home_state       TEXT,
  ADD COLUMN IF NOT EXISTS home_zip         TEXT,
  ADD COLUMN IF NOT EXISTS employment_type  TEXT,   -- Full-time / Part-time / Independent Contractor / Locum Tenens
  ADD COLUMN IF NOT EXISTS group_start_date DATE,
  ADD COLUMN IF NOT EXISTS group_end_date   DATE;
