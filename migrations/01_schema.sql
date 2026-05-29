-- ============================================================
-- CredFast Schema Migration v2
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- All changes are additive — nothing existing is modified.
-- ============================================================


-- ============================================================
-- 1. PROVIDERS — add credential and identity fields
-- ============================================================
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS date_of_birth          DATE,
  ADD COLUMN IF NOT EXISTS gender                 TEXT,             -- Male / Female / Other
  ADD COLUMN IF NOT EXISTS specialty              TEXT,             -- e.g. "Internal Medicine"
  ADD COLUMN IF NOT EXISTS taxonomy_code          TEXT,             -- 10-digit NUCC taxonomy, e.g. 207R00000X
  ADD COLUMN IF NOT EXISTS license_number         TEXT,
  ADD COLUMN IF NOT EXISTS license_state          TEXT,             -- 2-char state code
  ADD COLUMN IF NOT EXISTS license_expiration     DATE,
  ADD COLUMN IF NOT EXISTS dea_number             TEXT,             -- Drug Enforcement Administration
  ADD COLUMN IF NOT EXISTS caqh_number            TEXT,             -- CAQH ProView ID
  ADD COLUMN IF NOT EXISTS medicaid_number        TEXT,
  ADD COLUMN IF NOT EXISTS medicare_number        TEXT,             -- PTAN
  -- Malpractice insurance
  ADD COLUMN IF NOT EXISTS malpractice_carrier    TEXT,
  ADD COLUMN IF NOT EXISTS malpractice_policy     TEXT,
  ADD COLUMN IF NOT EXISTS malpractice_expiration DATE,
  ADD COLUMN IF NOT EXISTS malpractice_per_occurrence NUMERIC(12,2),  -- e.g. 1000000.00
  ADD COLUMN IF NOT EXISTS malpractice_aggregate  NUMERIC(12,2),      -- e.g. 3000000.00
  -- Education
  ADD COLUMN IF NOT EXISTS medical_school         TEXT,
  ADD COLUMN IF NOT EXISTS graduation_year        SMALLINT,
  ADD COLUMN IF NOT EXISTS residency_program      TEXT,
  ADD COLUMN IF NOT EXISTS residency_completion   SMALLINT,
  ADD COLUMN IF NOT EXISTS fellowship_program     TEXT,
  ADD COLUMN IF NOT EXISTS fellowship_completion  SMALLINT,
  -- Board
  ADD COLUMN IF NOT EXISTS board_certified        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS board_specialty        TEXT,
  ADD COLUMN IF NOT EXISTS board_expiration       DATE,
  -- Flags
  ADD COLUMN IF NOT EXISTS accepting_new_patients BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- Reason: These fields are required on virtually every payer enrollment form.
-- specialty + taxonomy_code identify the provider's practice type.
-- License, DEA, CAQH, Medicare/Medicaid numbers are collected on every
-- commercial and government enrollment application.
-- Malpractice info is mandatory for active status on most payer panels.
-- Education/board data is required for initial credentialing packets.


-- ============================================================
-- 2. GROUPS — add billing entity and contact fields
-- ============================================================
ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS taxonomy_code              TEXT,
  ADD COLUMN IF NOT EXISTS medicaid_group_number      TEXT,
  ADD COLUMN IF NOT EXISTS medicare_group_number      TEXT,           -- Group PTAN
  ADD COLUMN IF NOT EXISTS practice_type              TEXT,           -- Solo / Group / Hospital-Based / FQHC
  -- Authorized official (required on most payer apps)
  ADD COLUMN IF NOT EXISTS authorized_official_name   TEXT,
  ADD COLUMN IF NOT EXISTS authorized_official_title  TEXT,
  ADD COLUMN IF NOT EXISTS authorized_official_phone  TEXT,
  ADD COLUMN IF NOT EXISTS authorized_official_email  TEXT,
  ADD COLUMN IF NOT EXISTS notes                      TEXT,
  ADD COLUMN IF NOT EXISTS updated_at                 TIMESTAMPTZ;

-- Reason: The authorized official fields are required on every CMS 855
-- and commercial enrollment form. Taxonomy and billing numbers are
-- needed for group-level enrollment.


-- ============================================================
-- 3. LOCATIONS — add address detail and facility fields
-- ============================================================
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS address_2              TEXT,             -- Suite / Unit / Floor
  ADD COLUMN IF NOT EXISTS county                 TEXT,
  ADD COLUMN IF NOT EXISTS facility_type          TEXT,             -- Office / Clinic / Hospital / Urgent Care
  ADD COLUMN IF NOT EXISTS accepts_new_patients   BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS handicap_accessible    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_medicaid       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accepts_medicare       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hours_mon_fri          TEXT,             -- e.g. "8:00 AM - 5:00 PM"
  ADD COLUMN IF NOT EXISTS hours_weekend          TEXT,
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- Reason: address_2 is missing from nearly every multi-suite clinic.
-- facility_type and accessibility flags are collected on most forms.
-- Accepts new patients and insurance flags affect enrollment eligibility.


-- ============================================================
-- 4. PAYERS — add enrollment contact fields
-- ============================================================
ALTER TABLE payers
  ADD COLUMN IF NOT EXISTS payer_id_code          TEXT,             -- Payer's own enrollment code
  ADD COLUMN IF NOT EXISTS enrollment_phone       TEXT,
  ADD COLUMN IF NOT EXISTS enrollment_address     TEXT,
  ADD COLUMN IF NOT EXISTS processing_days        INTEGER,          -- typical turnaround in business days
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- Reason: Centralizing payer contact info avoids staff having to look it
-- up each time. processing_days gives teams an ETA after submission.


-- ============================================================
-- 5. ENROLLMENT APPLICATIONS — add submission tracking
-- ============================================================
ALTER TABLE enrollment_applications
  ADD COLUMN IF NOT EXISTS submitted_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS effective_date         DATE,             -- payer effective date once approved
  ADD COLUMN IF NOT EXISTS payer_reference        TEXT,            -- payer-assigned tracking number
  ADD COLUMN IF NOT EXISTS notes                  TEXT,
  ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- Reason: submitted_at / approved_at give audit timestamps. effective_date
-- is the date the provider can start billing under the payer.
-- payer_reference is the confirmation number the payer assigns.


-- ============================================================
-- 6. NEW TABLE: payer_forms
-- Stores payer PDF templates and their field-to-data mappings.
-- ============================================================
CREATE TABLE IF NOT EXISTS payer_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id        UUID REFERENCES payers(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                -- e.g. "Anthem Commercial Enrollment"
  description     TEXT,
  storage_path    TEXT,                         -- Supabase Storage path: payer-forms/{id}.pdf
  field_mappings  JSONB DEFAULT '{}',
  -- field_mappings format:
  --   { "PDF_FieldName": "provider.npi", "TaxID": "group.tax_id", ... }
  -- Supported data paths:
  --   provider.*   → providers table columns
  --   group.*      → groups table columns
  --   location.*   → first/primary location columns
  --   application.*→ enrollment_applications columns
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

-- Reason: This table is the bridge between payer PDF templates and your
-- provider data. Each row is a specific form from a specific payer,
-- with a JSON map of PDF form field names to data paths.


-- ============================================================
-- 7. NEW TABLE: application_documents
-- Tracks generated (filled) PDFs linked to an application.
-- ============================================================
CREATE TABLE IF NOT EXISTS application_documents (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_application_id   UUID REFERENCES enrollment_applications(id) ON DELETE CASCADE,
  payer_form_id               UUID REFERENCES payer_forms(id),
  storage_path                TEXT NOT NULL,    -- Supabase Storage path of the filled PDF
  generated_at                TIMESTAMPTZ DEFAULT NOW(),
  generated_by                TEXT              -- email or identifier of who triggered it
);

-- Reason: Keeps a log of every generated document tied to an application.
-- Allows regeneration if provider data changes after first generation.


-- ============================================================
-- 8. SEED: Common payers (skip if already seeded)
-- ============================================================
INSERT INTO payers (id, name, payer_id_code, processing_days)
VALUES
  (gen_random_uuid(), 'UnitedHealthcare',              '87726', 30),
  (gen_random_uuid(), 'Anthem Blue Cross Blue Shield', '00010', 45),
  (gen_random_uuid(), 'Aetna',                         '60054', 30),
  (gen_random_uuid(), 'Cigna',                         '62308', 45),
  (gen_random_uuid(), 'Humana',                        '61101', 30),
  (gen_random_uuid(), 'Molina Healthcare',             '13189', 60),
  (gen_random_uuid(), 'CVS / Aetna',                  '60054', 30),
  (gen_random_uuid(), 'Medicare (CMS)',                 'CMS',  90),
  (gen_random_uuid(), 'Medicaid',                       'MDCD', 90),
  (gen_random_uuid(), 'BCBS Federal Employee Program', '00010', 45),
  (gen_random_uuid(), 'Centene / Ambetter',            '68069', 60),
  (gen_random_uuid(), 'Oscar Health',                  '26375', 45),
  (gen_random_uuid(), 'WellCare',                      '55999', 60)
ON CONFLICT DO NOTHING;

-- Reason: Pre-seeds the payers table with the most common commercial
-- and government payers. Use ON CONFLICT DO NOTHING so re-running is safe.


-- ============================================================
-- 9. Storage bucket for payer PDF templates
-- Run this separately in Supabase Dashboard → Storage → New bucket
-- OR via the API. Name: "payer-forms", Public: false
-- ============================================================
-- NOTE: Bucket creation cannot be done in SQL — do it in the
-- Supabase dashboard: Storage → New bucket → "payer-forms", private.
-- Also create a bucket named "application-documents" for filled PDFs.
