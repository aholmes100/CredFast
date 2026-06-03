-- ================================================================
-- Riverside Medical Group — Demo Seed Data
-- Safe to re-run: all inserts use ON CONFLICT (id) DO NOTHING
-- organization_id: a0000000-0000-0000-0000-000000000001
-- ================================================================

-- ── Organization (must exist before any FK references it) ─────────

INSERT INTO organizations (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Riverside Medical Group Demo')
ON CONFLICT (id) DO NOTHING;


-- ── Group ─────────────────────────────────────────────────────────

INSERT INTO groups (
  id, organization_id,
  name, legal_name, tax_id, group_npi, taxonomy_code, practice_type,
  authorized_official_name, authorized_official_title,
  authorized_official_phone, authorized_official_email,
  credentialing_contact_name, credentialing_contact_email,
  credentialing_contact_phone, credentialing_contact_fax,
  billing_name, billing_address_1, billing_address_2,
  billing_city, billing_state, billing_zip,
  billing_phone, billing_fax
) VALUES (
  'e1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Riverside Medical Group',
  'Riverside Medical Group, LLC',
  '74-2891053',
  '1609872451',
  '193400000X',
  'Multi-Specialty Group',
  'Robert A. Chen, MD',
  'Medical Director',
  '(512) 555-0100',
  'rchen@riversidemedical.com',
  'Sarah Okonkwo',
  'credentialing@riversidemedical.com',
  '(512) 555-0101',
  '(512) 555-0199',
  'Riverside Medical Group, LLC',
  '2450 Riverside Drive',
  'Suite 100',
  'Austin', 'TX', '78741',
  '(512) 555-0102',
  '(512) 555-0198'
) ON CONFLICT (id) DO NOTHING;


-- ── Locations ─────────────────────────────────────────────────────

INSERT INTO locations (
  id, organization_id, group_id,
  name, address_1, address_2, city, state, zip,
  phone, fax, facility_type,
  accepts_new_patients, handicap_accessible, accepts_medicaid, accepts_medicare,
  hours_mon_fri, hours_weekend,
  hours_monday, hours_tuesday, hours_wednesday, hours_thursday, hours_friday,
  hours_saturday, hours_sunday,
  is_active
) VALUES

-- 1. Main Clinic
(
  'e2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Medical – Main Clinic',
  '2450 Riverside Drive', 'Suite 100',
  'Austin', 'TX', '78741',
  '(512) 555-0200', '(512) 555-0299', 'Clinic',
  true, true, true, true,
  '8:00 AM – 6:00 PM', '9:00 AM – 1:00 PM',
  '8:00 AM - 6:00 PM', '8:00 AM - 6:00 PM', '8:00 AM - 6:00 PM',
  '8:00 AM - 6:00 PM', '8:00 AM - 6:00 PM',
  '9:00 AM - 1:00 PM', NULL,
  true
),

-- 2. North Campus
(
  'e2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Medical – North Campus',
  '8901 Research Blvd', 'Suite 300',
  'Austin', 'TX', '78758',
  '(512) 555-0210', '(512) 555-0289', 'Clinic',
  true, true, true, true,
  '7:30 AM – 5:30 PM', NULL,
  '7:30 AM - 5:30 PM', '7:30 AM - 5:30 PM', '7:30 AM - 5:30 PM',
  '7:30 AM - 5:30 PM', '7:30 AM - 5:30 PM',
  NULL, NULL,
  true
),

-- 3. South Congress Clinic
(
  'e2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Medical – South Congress',
  '1100 South Congress Ave', NULL,
  'Austin', 'TX', '78704',
  '(512) 555-0220', '(512) 555-0279', 'Clinic',
  true, true, true, true,
  '8:00 AM – 5:00 PM', NULL,
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  NULL, NULL,
  true
),

-- 4. Round Rock Clinic
(
  'e2000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Medical – Round Rock',
  '405 University Blvd', 'Suite 200',
  'Round Rock', 'TX', '78665',
  '(512) 555-0230', '(512) 555-0269', 'Clinic',
  true, true, true, true,
  '8:00 AM – 5:00 PM', NULL,
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  NULL, NULL,
  true
),

-- 5. Cedar Park Clinic
(
  'e2000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Medical – Cedar Park',
  '1890 East Whitestone Blvd', NULL,
  'Cedar Park', 'TX', '78613',
  '(512) 555-0240', '(512) 555-0259', 'Clinic',
  true, false, true, true,
  '8:00 AM – 5:00 PM', NULL,
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  NULL, NULL,
  true
),

-- 6. Regional Hospital (24/7)
(
  'e2000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Regional Medical Center',
  '3600 North Hills Drive', NULL,
  'Austin', 'TX', '78731',
  '(512) 555-0250', '(512) 555-0249', 'Hospital',
  true, true, true, true,
  'Open 24 Hours', 'Open 24 Hours',
  'Open 24 Hours', 'Open 24 Hours', 'Open 24 Hours',
  'Open 24 Hours', 'Open 24 Hours',
  'Open 24 Hours', 'Open 24 Hours',
  true
),

-- 7. Urgent Care – North Austin
(
  'e2000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Urgent Care – North',
  '12100 Metric Blvd', 'Suite 120',
  'Austin', 'TX', '78758',
  '(512) 555-0260', '(512) 555-0239', 'Urgent Care',
  true, true, true, true,
  '7:00 AM – 9:00 PM', '8:00 AM – 6:00 PM',
  '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM',
  '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM',
  '8:00 AM - 6:00 PM', '8:00 AM - 6:00 PM',
  true
),

-- 8. Urgent Care – South
(
  'e2000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Urgent Care – South',
  '5500 South Lamar Blvd', NULL,
  'Austin', 'TX', '78745',
  '(512) 555-0270', '(512) 555-0229', 'Urgent Care',
  true, true, true, true,
  '7:00 AM – 9:00 PM', '8:00 AM – 6:00 PM',
  '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM',
  '7:00 AM - 9:00 PM', '7:00 AM - 9:00 PM',
  '8:00 AM - 6:00 PM', '8:00 AM - 6:00 PM',
  true
),

-- 9. Pediatrics Center
(
  'e2000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Pediatrics Center',
  '1400 Slaughter Lane', 'Suite 150',
  'Austin', 'TX', '78748',
  '(512) 555-0280', '(512) 555-0219', 'Clinic',
  true, true, true, true,
  '8:00 AM – 5:00 PM', '9:00 AM – 12:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '9:00 AM - 12:00 PM', NULL,
  true
),

-- 10. Heart & Vascular Center
(
  'e2000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  'Riverside Heart & Vascular Center',
  '3801 North Lamar Blvd', 'Suite 400',
  'Austin', 'TX', '78756',
  '(512) 555-0290', '(512) 555-0209', 'Clinic',
  true, true, false, true,
  '8:00 AM – 5:00 PM', NULL,
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  '8:00 AM - 5:00 PM', '8:00 AM - 5:00 PM',
  NULL, NULL,
  true
)

ON CONFLICT (id) DO NOTHING;


-- ── Providers ─────────────────────────────────────────────────────

INSERT INTO providers (
  id, organization_id,
  first_name, last_name, middle_name, credential_suffix,
  npi, email, phone, date_of_birth, gender,
  specialty, taxonomy_code, accepting_new_patients, is_pcp, languages,
  license_number, license_state, license_expiration,
  dea_number, caqh_number,
  malpractice_carrier, malpractice_policy, malpractice_expiration,
  malpractice_per_occurrence, malpractice_aggregate,
  board_certified, board_specialty, board_expiration,
  medical_school, graduation_year, residency_program, residency_completion,
  fellowship_program, fellowship_completion,
  hospital_affiliation, notes
) VALUES

-- 1. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'James', 'Mitchell', 'A.', 'MD',
  '1528374651', 'jmitchell@riversidemedical.com', '(512) 555-1001',
  '1972-04-15', 'M',
  'Internal Medicine', '207R00000X', true, true, 'English, Spanish',
  'K1823741', 'TX', '2027-08-31',
  'BM1234561', '12847593',
  'The Doctors Company', 'TDC-2025-74521', '2027-05-31',
  1000000, 3000000,
  true, 'Internal Medicine', '2028-12-31',
  'University of Texas Medical Branch', 1998, 'UT Southwestern Internal Medicine Residency', 2001,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Founding physician. Subspecialty interest in diabetes management.'
),

-- 2. Family Medicine — license and malpractice expiring within 90 days
(
  'e3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Sarah', 'Chen', 'J.', 'MD',
  '1639485762', 'schen@riversidemedical.com', '(512) 555-1002',
  '1980-09-22', 'F',
  'Family Medicine', '207Q00000X', true, true, 'English, Mandarin',
  'K2934567', 'TX', '2026-07-31',
  'BC1345672', '23958714',
  'Coverys', 'COV-2025-83412', '2026-07-31',
  1000000, 3000000,
  true, 'Family Medicine', '2029-06-30',
  'Baylor College of Medicine', 2004, 'Baylor Family Medicine Residency', 2007,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'License and malpractice both renew July 2026 — submit renewal docs by June 15.'
),

-- 3. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Robert', 'Williams', 'M.', 'MD',
  '1740596873', 'rwilliams@riversidemedical.com', '(512) 555-1003',
  '1968-12-03', 'M',
  'Internal Medicine', '207R00000X', true, false, 'English',
  'K3045678', 'TX', '2027-12-31',
  'BW1456783', '34069825',
  'ProAssurance', 'PA-2025-56789', '2027-01-31',
  1000000, 3000000,
  true, 'Internal Medicine', '2027-12-31',
  'Johns Hopkins University School of Medicine', 1994, 'Johns Hopkins Internal Medicine Residency', 1997,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Geriatric medicine focus. Board member since 2019.'
),

-- 4. Pediatrics — malpractice expiring soon
(
  'e3000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Emily', 'Rodriguez', 'K.', 'MD',
  '1851607984', 'erodriguez@riversidemedical.com', '(512) 555-1004',
  '1985-06-17', 'F',
  'Pediatrics', '208000000X', true, false, 'English, Spanish',
  'K4156789', 'TX', '2028-03-31',
  'BR1567894', '45170936',
  'MedPro Group', 'MPG-2025-23456', '2026-07-31',
  1000000, 3000000,
  true, 'Pediatrics', '2030-06-30',
  'UT Health San Antonio Long School of Medicine', 2009, 'Texas Children''s Hospital Pediatric Residency', 2012,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Malpractice renewal due July 2026.'
),

-- 5. Cardiology
(
  'e3000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Michael', 'Thompson', 'T.', 'MD',
  '1962718095', 'mthompson@riversidemedical.com', '(512) 555-1005',
  '1970-02-28', 'M',
  'Cardiology', '207RC0000X', true, false, 'English',
  'K5267890', 'TX', '2027-06-30',
  'BT1678905', '56281047',
  'MedPro Group', 'MPG-2025-34567', '2027-06-30',
  1000000, 3000000,
  true, 'Cardiovascular Disease', '2028-12-31',
  'Mayo Clinic Alix School of Medicine', 1996, 'Mayo Clinic Internal Medicine Residency', 1999,
  'Cleveland Clinic Cardiovascular Disease Fellowship', 2002,
  'Riverside Regional Medical Center',
  'Interventional cardiology privileges at Riverside Regional.'
),

-- 6. OB/GYN — license EXPIRED
(
  'e3000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'Lisa', 'Anderson', 'M.', 'MD',
  '1073829206', 'landerson@riversidemedical.com', '(512) 555-1006',
  '1975-11-08', 'F',
  'Obstetrics & Gynecology', '207V00000X', true, false, 'English',
  'K6378901', 'TX', '2025-12-31',
  'BA1789016', '67392158',
  'The Doctors Company', 'TDC-2025-85432', '2026-12-31',
  1000000, 3000000,
  true, 'Obstetrics and Gynecology', '2027-12-31',
  'Emory University School of Medicine', 2000, 'Emory OB/GYN Residency', 2004,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'TX LICENSE EXPIRED 12/31/2025 — renewal application submitted 01/15/2026. Do not submit new payer applications until renewal confirmed.'
),

-- 7. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'David', 'Park', 'S.', 'MD',
  '1184930317', 'dpark@riversidemedical.com', '(512) 555-1007',
  '1978-03-25', 'M',
  'Internal Medicine', '207R00000X', true, true, 'English, Korean',
  'K7489012', 'TX', '2027-11-30',
  'BP1890127', '78403269',
  'ProAssurance', 'PA-2025-67890', '2027-11-30',
  1000000, 3000000,
  true, 'Internal Medicine', '2028-06-30',
  'University of California San Francisco School of Medicine', 2002, 'UCSF Internal Medicine Residency', 2005,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 8. Family Medicine
(
  'e3000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'Jennifer', 'Martinez', 'L.', 'MD',
  '1295041428', 'jmartinez@riversidemedical.com', '(512) 555-1008',
  '1982-08-14', 'F',
  'Family Medicine', '207Q00000X', true, true, 'English, Spanish',
  'K8590123', 'TX', '2028-01-31',
  'BM2901238', '89514370',
  'Coverys', 'COV-2025-94123', '2028-01-31',
  1000000, 3000000,
  true, 'Family Medicine', '2030-01-31',
  'UT Health San Antonio Long School of Medicine', 2006, 'UT Southwestern Family Medicine Residency', 2009,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 9. Orthopedic Surgery
(
  'e3000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'Christopher', 'Davis', 'R.', 'MD',
  '1306152539', 'cdavis@riversidemedical.com', '(512) 555-1009',
  '1973-07-19', 'M',
  'Orthopedic Surgery', '207X00000X', true, false, 'English',
  'K9601234', 'TX', '2027-07-31',
  'BD3012349', '90625481',
  'ProAssurance', 'PA-2025-78901', '2027-07-31',
  1000000, 3000000,
  true, 'Orthopedic Surgery', '2027-12-31',
  'Duke University School of Medicine', 1998, 'UT Southwestern Orthopedic Surgery Residency', 2003,
  'Hospital for Special Surgery Sports Medicine Fellowship', 2004,
  'Riverside Regional Medical Center',
  'Sports medicine and total joint replacement. Team physician for UT Athletics.'
),

-- 10. Pediatrics
(
  'e3000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'Amanda', 'Wilson', 'R.', 'MD',
  '1417263640', 'awilson@riversidemedical.com', '(512) 555-1010',
  '1983-01-30', 'F',
  'Pediatrics', '208000000X', true, false, 'English',
  'K0712345', 'TX', '2028-06-30',
  'BW4123450', '01736592',
  'MedPro Group', 'MPG-2025-45678', '2028-06-30',
  1000000, 3000000,
  true, 'Pediatrics', '2030-12-31',
  'Vanderbilt University School of Medicine', 2007, 'Vanderbilt Pediatric Residency', 2010,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 11. Cardiology
(
  'e3000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000001',
  'Kevin', 'Brown', 'J.', 'MD',
  '1528374751', 'kbrown@riversidemedical.com', '(512) 555-1011',
  '1969-05-11', 'M',
  'Cardiology', '207RC0000X', true, false, 'English',
  'K1823557', 'TX', '2027-04-30',
  'BB5234561', '12847703',
  'Coverys', 'COV-2025-05234', '2027-04-30',
  1000000, 3000000,
  true, 'Cardiovascular Disease', '2028-06-30',
  'Washington University in St. Louis School of Medicine', 1994, 'Barnes-Jewish Hospital Internal Medicine Residency', 1997,
  'Washington University Cardiovascular Disease Fellowship', 2000,
  'Riverside Regional Medical Center',
  'Electrophysiology subspecialty. Performs EP studies and ablations.'
),

-- 12. OB/GYN — license EXPIRED
(
  'e3000000-0000-0000-0000-000000000012',
  'a0000000-0000-0000-0000-000000000001',
  'Maria', 'Garcia', 'E.', 'MD',
  '1639485862', 'mgarcia@riversidemedical.com', '(512) 555-1012',
  '1977-09-04', 'F',
  'Obstetrics & Gynecology', '207V00000X', true, false, 'English, Spanish',
  'K2934668', 'TX', '2026-04-30',
  'BG6345672', '23958814',
  'The Doctors Company', 'TDC-2025-16345', '2027-09-30',
  1000000, 3000000,
  true, 'Obstetrics and Gynecology', '2028-12-31',
  'University of Miami Miller School of Medicine', 2002, 'Jackson Memorial Hospital OB/GYN Residency', 2006,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'TX LICENSE EXPIRED 04/30/2026 — renewal in process. Hold payer applications.'
),

-- 13. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000013',
  'a0000000-0000-0000-0000-000000000001',
  'Thomas', 'Lee', 'H.', 'MD',
  '1740596973', 'tlee@riversidemedical.com', '(512) 555-1013',
  '1971-12-22', 'M',
  'Internal Medicine', '207R00000X', false, false, 'English',
  'K3045779', 'TX', '2027-10-31',
  'BL7456783', '34069925',
  'ProAssurance', 'PA-2025-89012', '2027-10-31',
  1000000, 3000000,
  true, 'Internal Medicine', '2027-06-30',
  'University of Pennsylvania Perelman School of Medicine', 1996, 'Penn Internal Medicine Residency', 1999,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Infectious disease subspecialty interest. Not currently accepting new patients.'
),

-- 14. Family Medicine
(
  'e3000000-0000-0000-0000-000000000014',
  'a0000000-0000-0000-0000-000000000001',
  'Rachel', 'Johnson', 'A.', 'MD',
  '1851607084', 'rjohnson@riversidemedical.com', '(512) 555-1014',
  '1984-04-07', 'F',
  'Family Medicine', '207Q00000X', true, true, 'English',
  'K4156890', 'TX', '2028-04-30',
  'BJ8567894', '45170036',
  'Coverys', 'COV-2025-27456', '2028-04-30',
  1000000, 3000000,
  true, 'Family Medicine', '2030-04-30',
  'Dell Medical School at UT Austin', 2008, 'Seton Family Medicine Residency', 2011,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 15. General Surgery — license expiring in 90 days
(
  'e3000000-0000-0000-0000-000000000015',
  'a0000000-0000-0000-0000-000000000001',
  'William', 'Taylor', 'P.', 'MD',
  '1962718195', 'wtaylor@riversidemedical.com', '(512) 555-1015',
  '1966-08-31', 'M',
  'General Surgery', '208600000X', true, false, 'English',
  'K5267991', 'TX', '2026-08-31',
  'BT9678905', '56281147',
  'MedPro Group', 'MPG-2025-56789', '2026-09-30',
  1000000, 3000000,
  true, 'General Surgery', '2027-12-31',
  'University of Texas Southwestern Medical Center', 1991, 'Parkland Memorial Hospital General Surgery Residency', 1996,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'License expires 08/31/2026 — initiate renewal by 07/01/2026.'
),

-- 16. Dermatology
(
  'e3000000-0000-0000-0000-000000000016',
  'a0000000-0000-0000-0000-000000000001',
  'Nicole', 'White', 'B.', 'MD',
  '1073829306', 'nwhite@riversidemedical.com', '(512) 555-1016',
  '1979-03-16', 'F',
  'Dermatology', '207N00000X', true, false, 'English',
  'K6379012', 'TX', '2027-12-31',
  'BW8012345', '67392258',
  'The Doctors Company', 'TDC-2025-38567', '2027-12-31',
  1000000, 3000000,
  true, 'Dermatology', '2029-12-31',
  'Northwestern University Feinberg School of Medicine', 2003, 'Northwestern Dermatology Residency', 2007,
  'Mohs Surgery Fellowship, MD Anderson', 2008,
  'Riverside Regional Medical Center',
  'Mohs surgery twice monthly at North Campus. Cosmetic derm procedures at South Congress.'
),

-- 17. Neurology
(
  'e3000000-0000-0000-0000-000000000017',
  'a0000000-0000-0000-0000-000000000001',
  'Steven', 'Harris', 'C.', 'MD',
  '1184930417', 'sharris@riversidemedical.com', '(512) 555-1017',
  '1974-06-28', 'M',
  'Neurology', '2084N0400X', true, false, 'English',
  'K7489123', 'TX', '2027-08-31',
  'BH7123456', '78403369',
  'ProAssurance', 'PA-2025-90123', '2027-08-31',
  1000000, 3000000,
  true, 'Neurology', '2028-12-31',
  'Columbia University College of Physicians and Surgeons', 1999, 'Columbia Neurology Residency', 2003,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Stroke neurology focus. Telestroke coverage for regional hospitals.'
),

-- 18. Psychiatry
(
  'e3000000-0000-0000-0000-000000000018',
  'a0000000-0000-0000-0000-000000000001',
  'Patricia', 'Clark', 'M.', 'MD',
  '1295041528', 'pclark@riversidemedical.com', '(512) 555-1018',
  '1976-10-05', 'F',
  'Psychiatry', '2084P0800X', true, false, 'English',
  'K8590234', 'TX', '2028-02-28',
  'BC6234567', '89514470',
  'Coverys', 'COV-2025-49678', '2028-02-28',
  1000000, 3000000,
  true, 'Psychiatry', '2029-06-30',
  'University of Michigan Medical School', 2001, 'University of Michigan Psychiatry Residency', 2005,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Adult outpatient psychiatry only. No inpatient or emergency consults.'
),

-- 19. Emergency Medicine
(
  'e3000000-0000-0000-0000-000000000019',
  'a0000000-0000-0000-0000-000000000001',
  'Daniel', 'Lewis', 'J.', 'MD',
  '1306152639', 'dlewis@riversidemedical.com', '(512) 555-1019',
  '1981-01-19', 'M',
  'Emergency Medicine', '207P00000X', true, false, 'English, Spanish',
  'K9601345', 'TX', '2028-01-31',
  'BL5345678', '90625581',
  'Coverys', 'COV-2025-61789', '2028-01-31',
  1000000, 3000000,
  true, 'Emergency Medicine', '2030-01-31',
  'University of Texas Medical Branch', 2005, 'Dell Seton EM Residency', 2008,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Shifts at hospital ED and covers both urgent care locations.'
),

-- 20. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000020',
  'a0000000-0000-0000-0000-000000000001',
  'Karen', 'Walker', 'L.', 'MD',
  '1417263740', 'kwalker@riversidemedical.com', '(512) 555-1020',
  '1973-08-23', 'F',
  'Internal Medicine', '207R00000X', true, true, 'English',
  'K0712456', 'TX', '2027-09-30',
  'BW4456789', '01736692',
  'The Doctors Company', 'TDC-2025-72890', '2027-09-30',
  1000000, 3000000,
  true, 'Internal Medicine', '2028-09-30',
  'University of Texas Medical Branch', 1999, 'UT Southwestern Internal Medicine Residency', 2002,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Women''s health focus within internal medicine practice.'
),

-- 21. Orthopedic Surgery
(
  'e3000000-0000-0000-0000-000000000021',
  'a0000000-0000-0000-0000-000000000001',
  'Mark', 'Robinson', 'D.', 'MD',
  '1528374851', 'mrobinson@riversidemedical.com', '(512) 555-1021',
  '1972-11-14', 'M',
  'Orthopedic Surgery', '207X00000X', true, false, 'English',
  'K1823658', 'TX', '2027-05-31',
  'BR3567890', '12847803',
  'ProAssurance', 'PA-2025-01234', '2027-05-31',
  1000000, 3000000,
  true, 'Orthopedic Surgery', '2028-06-30',
  'University of Texas Medical Branch', 1997, 'Texas Orthopedic Hospital Residency', 2002,
  'Spine Surgery Fellowship, Texas Back Institute', 2003,
  'Riverside Regional Medical Center',
  'Spine surgery focus — lumbar and cervical. OR schedule at Riverside Regional Tuesday/Thursday.'
),

-- 22. Pediatrics
(
  'e3000000-0000-0000-0000-000000000022',
  'a0000000-0000-0000-0000-000000000001',
  'Susan', 'Hall', 'B.', 'MD',
  '1639485962', 'shall@riversidemedical.com', '(512) 555-1022',
  '1980-07-02', 'F',
  'Pediatrics', '208000000X', true, false, 'English',
  'K2934769', 'TX', '2028-07-31',
  'BH2678901', '23958914',
  'MedPro Group', 'MPG-2025-12345', '2028-07-31',
  1000000, 3000000,
  true, 'Pediatrics', '2030-12-31',
  'Baylor College of Medicine', 2004, 'Texas Children''s Hospital Pediatric Residency', 2007,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 23. Cardiology
(
  'e3000000-0000-0000-0000-000000000023',
  'a0000000-0000-0000-0000-000000000001',
  'Joseph', 'Young', 'A.', 'MD',
  '1740597073', 'jyoung@riversidemedical.com', '(512) 555-1023',
  '1967-03-08', 'M',
  'Cardiology', '207RC0000X', true, false, 'English',
  'K3045880', 'TX', '2027-03-31',
  'BY1789012', '34070025',
  'MedPro Group', 'MPG-2025-67890', '2027-03-31',
  1000000, 3000000,
  true, 'Cardiovascular Disease', '2027-06-30',
  'Stanford University School of Medicine', 1992, 'Stanford Internal Medicine Residency', 1995,
  'Stanford Cardiovascular Disease Fellowship', 1998,
  'Riverside Regional Medical Center',
  'Echo lab director. Nuclear cardiology certification current through 2027.'
),

-- 24. Family Medicine
(
  'e3000000-0000-0000-0000-000000000024',
  'a0000000-0000-0000-0000-000000000001',
  'Catherine', 'King', 'E.', 'MD',
  '1851607184', 'cking@riversidemedical.com', '(512) 555-1024',
  '1983-05-26', 'F',
  'Family Medicine', '207Q00000X', true, true, 'English, French',
  'K4156991', 'TX', '2028-05-31',
  'BK0890123', '45171136',
  'Coverys', 'COV-2025-83901', '2028-05-31',
  1000000, 3000000,
  true, 'Family Medicine', '2030-05-31',
  'University of Texas Medical Branch', 2007, 'Seton Family Medicine Residency', 2010,
  NULL, NULL,
  'Riverside Regional Medical Center',
  NULL
),

-- 25. Internal Medicine
(
  'e3000000-0000-0000-0000-000000000025',
  'a0000000-0000-0000-0000-000000000001',
  'Andrew', 'Scott', 'R.', 'MD',
  '1962718295', 'ascott@riversidemedical.com', '(512) 555-1025',
  '1975-02-17', 'M',
  'Internal Medicine', '207R00000X', true, true, 'English',
  'K5268092', 'TX', '2027-02-28',
  'BS9901234', '56282247',
  'ProAssurance', 'PA-2025-12345', '2027-02-28',
  1000000, 3000000,
  true, 'Internal Medicine', '2028-02-28',
  'University of Virginia School of Medicine', 2000, 'UT Southwestern Internal Medicine Residency', 2003,
  NULL, NULL,
  'Riverside Regional Medical Center',
  'Hospital medicine background. Covers inpatient service 1 week per month.'
)

ON CONFLICT (id) DO NOTHING;


-- ── Provider–Group–Location Assignments ───────────────────────────
-- Most providers at 2–3 locations. All are active.
-- Location guide:
--   L1 = Main Clinic       L2 = North Campus     L3 = South Congress
--   L4 = Round Rock        L5 = Cedar Park        L6 = Regional Hospital
--   L7 = Urgent Care North L8 = Urgent Care South L9 = Pediatrics Center
--   L10 = Heart & Vascular

INSERT INTO provider_group_locations (id, organization_id, provider_id, group_id, location_id, is_primary, is_active) VALUES

-- P1 Mitchell (IM): Main Clinic (primary), Hospital, Urgent Care North
('e4000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000002','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),
('e4000000-0000-0000-0000-000000000003','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000007',false,true),

-- P2 Chen (FM): Main Clinic (primary), Round Rock, Urgent Care South
('e4000000-0000-0000-0000-000000000004','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000005','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',false,true),
('e4000000-0000-0000-0000-000000000006','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000008',false,true),

-- P3 Williams (IM): Main Clinic (primary), Cedar Park, Hospital
('e4000000-0000-0000-0000-000000000007','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000008','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000005',false,true),
('e4000000-0000-0000-0000-000000000009','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000003','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P4 Rodriguez (Peds): Pediatrics Center (primary), Cedar Park, Hospital
('e4000000-0000-0000-0000-000000000010','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000009',true, true),
('e4000000-0000-0000-0000-000000000011','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000005',false,true),
('e4000000-0000-0000-0000-000000000012','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000004','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P5 Thompson (Cardio): Heart & Vascular (primary), North Campus, Hospital
('e4000000-0000-0000-0000-000000000013','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000010',true, true),
('e4000000-0000-0000-0000-000000000014','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',false,true),
('e4000000-0000-0000-0000-000000000015','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000005','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P6 Anderson (OB): Main Clinic (primary), Hospital
('e4000000-0000-0000-0000-000000000016','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000006','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000017','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000006','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P7 Park (IM): Round Rock (primary), Hospital, Urgent Care South
('e4000000-0000-0000-0000-000000000018','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000007','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',true, true),
('e4000000-0000-0000-0000-000000000019','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000007','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),
('e4000000-0000-0000-0000-000000000020','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000007','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000008',false,true),

-- P8 Martinez (FM): North Campus (primary), Round Rock, Hospital
('e4000000-0000-0000-0000-000000000021','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000008','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',true, true),
('e4000000-0000-0000-0000-000000000022','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000008','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',false,true),
('e4000000-0000-0000-0000-000000000023','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000008','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P9 Davis (Ortho): North Campus (primary), Hospital
('e4000000-0000-0000-0000-000000000024','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000009','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',true, true),
('e4000000-0000-0000-0000-000000000025','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000009','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P10 Wilson (Peds): Pediatrics Center (primary), South Congress, Hospital
('e4000000-0000-0000-0000-000000000026','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000010','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000009',true, true),
('e4000000-0000-0000-0000-000000000027','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000010','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000003',false,true),
('e4000000-0000-0000-0000-000000000028','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000010','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P11 Brown (Cardio): Heart & Vascular (primary), Main Clinic, Hospital
('e4000000-0000-0000-0000-000000000029','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000011','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000010',true, true),
('e4000000-0000-0000-0000-000000000030','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000011','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',false,true),
('e4000000-0000-0000-0000-000000000031','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000011','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P12 Garcia (OB): Main Clinic (primary), Hospital
('e4000000-0000-0000-0000-000000000032','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000012','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000033','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000012','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P13 Lee (IM): South Congress (primary), Hospital, Urgent Care North
('e4000000-0000-0000-0000-000000000034','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000013','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000003',true, true),
('e4000000-0000-0000-0000-000000000035','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000013','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),
('e4000000-0000-0000-0000-000000000036','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000013','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000007',false,true),

-- P14 Johnson (FM): South Congress (primary), Cedar Park, Hospital
('e4000000-0000-0000-0000-000000000037','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000014','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000003',true, true),
('e4000000-0000-0000-0000-000000000038','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000014','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000005',false,true),
('e4000000-0000-0000-0000-000000000039','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000014','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P15 Taylor (Surgery): Hospital (primary), North Campus
('e4000000-0000-0000-0000-000000000040','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000015','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',true, true),
('e4000000-0000-0000-0000-000000000041','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000015','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',false,true),

-- P16 White (Derm): North Campus (primary), South Congress
('e4000000-0000-0000-0000-000000000042','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000016','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',true, true),
('e4000000-0000-0000-0000-000000000043','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000016','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000003',false,true),

-- P17 Harris (Neuro): Main Clinic (primary), Hospital
('e4000000-0000-0000-0000-000000000044','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000017','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',true, true),
('e4000000-0000-0000-0000-000000000045','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000017','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P18 Clark (Psych): South Congress only
('e4000000-0000-0000-0000-000000000046','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000018','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000003',true, true),

-- P19 Lewis (EM): Hospital (primary), Urgent Care North, Urgent Care South
('e4000000-0000-0000-0000-000000000047','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000019','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',true, true),
('e4000000-0000-0000-0000-000000000048','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000019','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000007',false,true),
('e4000000-0000-0000-0000-000000000049','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000019','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000008',false,true),

-- P20 Walker (IM): Round Rock (primary), Hospital, Urgent Care North
('e4000000-0000-0000-0000-000000000050','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000020','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',true, true),
('e4000000-0000-0000-0000-000000000051','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000020','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),
('e4000000-0000-0000-0000-000000000052','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000020','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000007',false,true),

-- P21 Robinson (Ortho): North Campus (primary), Hospital
('e4000000-0000-0000-0000-000000000053','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000021','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000002',true, true),
('e4000000-0000-0000-0000-000000000054','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000021','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P22 Hall (Peds): Pediatrics Center (primary), Round Rock, Hospital
('e4000000-0000-0000-0000-000000000055','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000022','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000009',true, true),
('e4000000-0000-0000-0000-000000000056','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000022','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',false,true),
('e4000000-0000-0000-0000-000000000057','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000022','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P23 Young (Cardio): Heart & Vascular (primary), Hospital
('e4000000-0000-0000-0000-000000000058','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000023','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000010',true, true),
('e4000000-0000-0000-0000-000000000059','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000023','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P24 King (FM): Cedar Park (primary), Main Clinic, Hospital
('e4000000-0000-0000-0000-000000000060','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000024','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000005',true, true),
('e4000000-0000-0000-0000-000000000061','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000024','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',false,true),
('e4000000-0000-0000-0000-000000000062','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000024','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true),

-- P25 Scott (IM): Round Rock (primary), Cedar Park, Hospital
('e4000000-0000-0000-0000-000000000063','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000025','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000004',true, true),
('e4000000-0000-0000-0000-000000000064','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000025','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000005',false,true),
('e4000000-0000-0000-0000-000000000065','a0000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000025','e1000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000006',false,true)

ON CONFLICT (id) DO NOTHING;
