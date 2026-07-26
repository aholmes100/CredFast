-- Rename group_npi_override → group_npi on locations.
-- provider_group_locations.group_npi_override is intentionally left untouched.
ALTER TABLE locations RENAME COLUMN group_npi_override TO group_npi;

-- Add Medicare and Medicaid number overrides and a location-specific NPI.
-- These can differ per physical location within the same group.
-- Roster and PDF generation should check these first, fall back to the group row if null.
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS group_medicare_number  TEXT,
  ADD COLUMN IF NOT EXISTS group_medicaid_number  TEXT,
  ADD COLUMN IF NOT EXISTS location_npi           TEXT;
