-- Migration 15: Group NPI override per assignment and per location
-- IMPORTANT: Run this in Supabase SQL Editor before using the Group NPI Override field.

-- Per-assignment override (used by roster generation)
ALTER TABLE provider_group_locations
  ADD COLUMN IF NOT EXISTS group_npi_override text;

-- Per-location override (used by LocationDetailEditor)
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS group_npi_override text;
