-- providers: clinical/administrative fields
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS credentialing_status        TEXT,          -- Initial, Re-credentialing, Pending, Complete
  ADD COLUMN IF NOT EXISTS is_hospital_based           BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_w2                       BOOLEAN,
  ADD COLUMN IF NOT EXISTS supervising_physician_npi   TEXT,
  ADD COLUMN IF NOT EXISTS supervising_physician_name  TEXT,
  ADD COLUMN IF NOT EXISTS race                        TEXT,
  ADD COLUMN IF NOT EXISTS ethnicity                   TEXT,
  ADD COLUMN IF NOT EXISTS offers_telehealth           BOOLEAN;

-- provider_identifiers: expiration date (effective_date is retained; DEA registrations expire)
ALTER TABLE provider_identifiers
  ADD COLUMN IF NOT EXISTS expiration_date             DATE;

-- locations: telehealth capability, after-hours contact, time zone
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS telehealth                  BOOLEAN,
  ADD COLUMN IF NOT EXISTS after_hours_phone           TEXT,
  ADD COLUMN IF NOT EXISTS time_zone                   TEXT;

-- provider_payer_enrollments: line-of-business indicators and network dates
ALTER TABLE provider_payer_enrollments
  ADD COLUMN IF NOT EXISTS lob_commercial              BOOLEAN,
  ADD COLUMN IF NOT EXISTS lob_medicare                BOOLEAN,
  ADD COLUMN IF NOT EXISTS lob_medicaid                BOOLEAN,
  ADD COLUMN IF NOT EXISTS lob_marketplace             BOOLEAN,
  ADD COLUMN IF NOT EXISTS network_effective_date      DATE,
  ADD COLUMN IF NOT EXISTS network_termination_date    DATE;
