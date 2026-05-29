-- ============================================================
-- CredFast seed data — realistic credentialing dataset
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING)
-- ============================================================

-- ── Groups ───────────────────────────────────────────────────

INSERT INTO groups (
  id, name, legal_name, tax_id, group_npi, practice_type,
  authorized_official_name, authorized_official_title, authorized_official_phone, authorized_official_email,
  credentialing_contact_name, credentialing_contact_email, credentialing_contact_phone, credentialing_contact_fax,
  billing_name, billing_address_1, billing_city, billing_state, billing_zip
) VALUES
(
  'a1000000-0000-0000-0000-000000000001',
  'Blue Ridge Family Medicine',
  'Blue Ridge Family Medicine PLLC',
  '54-1923847',
  '1234567890',
  'Family Medicine',
  'Patricia Holloway',
  'Practice Administrator',
  '(540) 555-0101',
  'pholloway@blueridgefm.com',
  'Sandra Kim',
  'skim@blueridgefm.com',
  '(540) 555-0102',
  '(540) 555-0103',
  'Blue Ridge Family Medicine PLLC',
  'PO Box 1250',
  'Roanoke',
  'VA',
  '24011'
),
(
  'a1000000-0000-0000-0000-000000000002',
  'Valley Orthopaedic Associates',
  'Valley Orthopaedic Associates PC',
  '54-2034958',
  '1345678901',
  'Specialty — Orthopedics',
  'James Thornton',
  'CEO',
  '(540) 555-0201',
  'jthornton@valleyortho.com',
  'Rachel Nguyen',
  'rnguyen@valleyortho.com',
  '(540) 555-0202',
  '(540) 555-0203',
  'Valley Orthopaedic Associates PC',
  '88 Medical Park Drive, Suite 200',
  'Harrisonburg',
  'VA',
  '22801'
),
(
  'a1000000-0000-0000-0000-000000000003',
  'Shenandoah Pediatrics',
  'Shenandoah Pediatric Medicine PLLC',
  '54-3145069',
  '1456789012',
  'Pediatrics',
  'Dr. Michael Osei',
  'Medical Director',
  '(540) 555-0301',
  'mosei@shenanpeds.com',
  'Linda Torres',
  'ltorres@shenanpeds.com',
  '(540) 555-0302',
  '(540) 555-0303',
  'Shenandoah Pediatric Medicine PLLC',
  '400 Valley Health Blvd',
  'Winchester',
  'VA',
  '22601'
),
(
  'a1000000-0000-0000-0000-000000000004',
  'Appalachian Internal Medicine',
  'Appalachian Internal Medicine Group LLC',
  '54-4256170',
  '1567890123',
  'Internal Medicine',
  'Carol Watkins',
  'Practice Manager',
  '(304) 555-0401',
  'cwatkins@appalachianim.com',
  'Tom Garrett',
  'tgarrett@appalachianim.com',
  '(304) 555-0402',
  '(304) 555-0403',
  'Appalachian Internal Medicine Group LLC',
  '75 Mountainview Terrace',
  'Lewisburg',
  'WV',
  '24901'
),
(
  'a1000000-0000-0000-0000-000000000005',
  'Summit Women''s Health',
  'Summit Women''s Health & OB/GYN Associates PLLC',
  '54-5367281',
  '1678901234',
  'Specialty — OB/GYN',
  'Dr. Angela Prentiss',
  'Chief Medical Officer',
  '(540) 555-0501',
  'aprentiss@summitwomens.com',
  'Maria Espinoza',
  'mespinoza@summitwomens.com',
  '(540) 555-0502',
  '(540) 555-0503',
  'Summit Women''s Health & OB/GYN Associates PLLC',
  '200 Summit Medical Park',
  'Staunton',
  'VA',
  '24401'
)
ON CONFLICT (id) DO NOTHING;


-- ── Locations ─────────────────────────────────────────────────

INSERT INTO locations (
  id, group_id, name, address_1, address_2, city, state, zip,
  phone, fax, facility_type, accepts_new_patients, handicap_accessible,
  accepts_medicaid, accepts_medicare, hours_mon_fri, hours_weekend, is_active
) VALUES
-- Blue Ridge Family Medicine (3 locations)
(
  'c1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001',
  'Blue Ridge FM — Main Street',
  '1420 Main Street SW',
  'Suite 100',
  'Roanoke', 'VA', '24015',
  '(540) 555-1001', '(540) 555-1002',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', '9:00 AM – 12:00 PM', true
),
(
  'c1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000001',
  'Blue Ridge FM — Salem',
  '600 Electric Road',
  NULL,
  'Salem', 'VA', '24153',
  '(540) 555-1011', '(540) 555-1012',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', NULL, true
),
(
  'c1000000-0000-0000-0000-000000000003',
  'a1000000-0000-0000-0000-000000000001',
  'Blue Ridge FM — Vinton',
  '125 South Pollard Street',
  NULL,
  'Vinton', 'VA', '24179',
  '(540) 555-1021', '(540) 555-1022',
  'Office', false, true, true, true,
  '8:00 AM – 4:00 PM', NULL, true
),
-- Valley Orthopaedic Associates (3 locations)
(
  'c1000000-0000-0000-0000-000000000004',
  'a1000000-0000-0000-0000-000000000002',
  'Valley Ortho — Medical Park',
  '88 Medical Park Drive',
  'Suite 200',
  'Harrisonburg', 'VA', '22801',
  '(540) 555-2001', '(540) 555-2002',
  'Office', true, true, false, true,
  '7:30 AM – 5:30 PM', NULL, true
),
(
  'c1000000-0000-0000-0000-000000000005',
  'a1000000-0000-0000-0000-000000000002',
  'Valley Ortho — Surgery Center',
  '110 Professional Drive',
  NULL,
  'Harrisonburg', 'VA', '22801',
  '(540) 555-2011', '(540) 555-2012',
  'Ambulatory Surgery Center', false, true, false, true,
  '6:00 AM – 5:00 PM', NULL, true
),
(
  'c1000000-0000-0000-0000-000000000006',
  'a1000000-0000-0000-0000-000000000002',
  'Valley Ortho — Staunton',
  '50 Frontier Drive',
  'Suite 104',
  'Staunton', 'VA', '24401',
  '(540) 555-2021', '(540) 555-2022',
  'Office', true, true, false, true,
  '8:00 AM – 4:00 PM', NULL, false
),
-- Shenandoah Pediatrics (2 locations)
(
  'c1000000-0000-0000-0000-000000000007',
  'a1000000-0000-0000-0000-000000000003',
  'Shenandoah Peds — Winchester Main',
  '400 Valley Health Blvd',
  'Suite 110',
  'Winchester', 'VA', '22601',
  '(540) 555-3001', '(540) 555-3002',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', '9:00 AM – 1:00 PM', true
),
(
  'c1000000-0000-0000-0000-000000000008',
  'a1000000-0000-0000-0000-000000000003',
  'Shenandoah Peds — Stephens City',
  '333 Tasker Road',
  NULL,
  'Stephens City', 'VA', '22655',
  '(540) 555-3011', '(540) 555-3012',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', NULL, true
),
-- Appalachian Internal Medicine (2 locations)
(
  'c1000000-0000-0000-0000-000000000009',
  'a1000000-0000-0000-0000-000000000004',
  'Appalachian IM — Lewisburg',
  '75 Mountainview Terrace',
  NULL,
  'Lewisburg', 'WV', '24901',
  '(304) 555-4001', '(304) 555-4002',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', NULL, true
),
(
  'c1000000-0000-0000-0000-000000000010',
  'a1000000-0000-0000-0000-000000000004',
  'Appalachian IM — Beckley',
  '200 Health Sciences Drive',
  'Suite 301',
  'Beckley', 'WV', '25801',
  '(304) 555-4011', '(304) 555-4012',
  'Office', true, false, true, true,
  '8:00 AM – 4:30 PM', NULL, true
),
-- Summit Women's Health (2 locations)
(
  'c1000000-0000-0000-0000-000000000011',
  'a1000000-0000-0000-0000-000000000005',
  'Summit Women''s — Staunton',
  '200 Summit Medical Park',
  'Building A',
  'Staunton', 'VA', '24401',
  '(540) 555-5001', '(540) 555-5002',
  'Office', true, true, true, true,
  '8:00 AM – 5:00 PM', NULL, true
),
(
  'c1000000-0000-0000-0000-000000000012',
  'a1000000-0000-0000-0000-000000000005',
  'Summit Women''s — Waynesboro',
  '560 West Broad Street',
  NULL,
  'Waynesboro', 'VA', '22980',
  '(540) 555-5011', '(540) 555-5012',
  'Office', true, true, true, true,
  '8:00 AM – 4:00 PM', NULL, true
)
ON CONFLICT (id) DO NOTHING;


-- ── Payers ────────────────────────────────────────────────────

INSERT INTO payers (id, name, payer_id_code, enrollment_phone, enrollment_address, processing_days, notes)
VALUES
(
  'd1000000-0000-0000-0000-000000000001',
  'Anthem Blue Cross Blue Shield',
  'ANTBCBS',
  '(800) 676-2583',
  '120 Monument Circle, Indianapolis, IN 46204',
  45,
  'PECOS required for Medicare Advantage. Allow 45–60 days.'
),
(
  'd1000000-0000-0000-0000-000000000002',
  'Aetna',
  'AETNA',
  '(800) 353-1232',
  '151 Farmington Ave, Hartford, CT 06156',
  30,
  'CAQH required. Typical turnaround 30–45 days.'
),
(
  'd1000000-0000-0000-0000-000000000003',
  'Cigna',
  'CIGNA',
  '(800) 735-1459',
  '900 Cottage Grove Road, Bloomfield, CT 06002',
  35,
  NULL
),
(
  'd1000000-0000-0000-0000-000000000004',
  'UnitedHealthcare',
  'UNITED',
  '(866) 889-8054',
  '9900 Bren Road East, Minnetonka, MN 55343',
  60,
  'Uses Provider Portal for online credentialing. CAQH attestation required within 120 days.'
),
(
  'd1000000-0000-0000-0000-000000000005',
  'Humana',
  'HUMANA',
  '(800) 626-2739',
  '500 West Main Street, Louisville, KY 40202',
  45,
  NULL
),
(
  'd1000000-0000-0000-0000-000000000006',
  'Virginia Medicaid (DMAS)',
  'VADMAS',
  '(804) 786-6273',
  '600 East Broad Street, Richmond, VA 23219',
  90,
  'State Medicaid. Submit through PRISM portal. Allow 90 days minimum.'
),
(
  'd1000000-0000-0000-0000-000000000007',
  'Medicare — Novitas Solutions',
  'NOVITAS',
  '(855) 252-8782',
  '2020 Technology Parkway, Mechanicsburg, PA 17050',
  90,
  'MAC for VA/WV. PECOS enrollment required.'
),
(
  'd1000000-0000-0000-0000-000000000008',
  'Molina Healthcare',
  'MOLINA',
  '(888) 562-5442',
  'PO Box 22800, Long Beach, CA 90801',
  45,
  NULL
),
(
  'd1000000-0000-0000-0000-000000000009',
  'WellCare Health Plans',
  'WLCR',
  '(866) 231-1821',
  '8735 Henderson Road, Tampa, FL 33634',
  30,
  NULL
),
(
  'd1000000-0000-0000-0000-000000000010',
  'Kaiser Permanente',
  'KAISER',
  '(800) 777-7902',
  '1 Kaiser Plaza, Oakland, CA 94612',
  60,
  'Closed network — requires direct referral relationship. Contact provider relations before submitting.'
)
ON CONFLICT (id) DO NOTHING;


-- ── Providers ─────────────────────────────────────────────────
-- Mix of specialties, credential statuses (some expired, some expiring, some ok)

INSERT INTO providers (
  id, first_name, last_name, middle_name, credential_suffix,
  npi, email, phone, date_of_birth, gender,
  specialty, secondary_specialty, taxonomy_code,
  accepting_new_patients, is_pcp, languages,
  license_number, license_state, license_expiration,
  dea_number, caqh_number,
  malpractice_carrier, malpractice_policy, malpractice_expiration,
  malpractice_per_occurrence, malpractice_aggregate,
  medical_school, graduation_year, residency_program, residency_completion,
  board_certified, board_specialty, board_expiration,
  notes
) VALUES

-- Blue Ridge Family Medicine providers
(
  'b1000000-0000-0000-0000-000000000001',
  'David', 'Callahan', 'Michael', 'MD',
  '1023456789', 'dcallahan@blueridgefm.com', '(540) 555-1101', '1975-03-14', 'M',
  'Family Medicine', NULL, '207Q00000X',
  true, true, 'English, Spanish',
  'VA-MD-14892', 'VA', '2027-09-30',
  'BC4291034', '12345678',
  'The Doctors Company', 'TDC-2024-09134', '2026-10-31',
  1000000, 3000000,
  'University of Virginia School of Medicine', 1999, 'VCU Family Medicine Residency', 2002,
  true, 'Family Medicine', '2028-12-31',
  'Founding physician. Sees predominantly Medicare population.'
),
(
  'b1000000-0000-0000-0000-000000000002',
  'Jennifer', 'Marsh', 'Lynn', 'MD',
  '1034567890', 'jmarsh@blueridgefm.com', '(540) 555-1102', '1980-07-22', 'F',
  'Family Medicine', NULL, '207Q00000X',
  true, true, 'English',
  'VA-MD-19204', 'VA', '2026-06-30',
  'BM5103947', '23456789',
  'ProAssurance', 'PA-2025-88231', '2026-06-30',
  1000000, 3000000,
  'Eastern Virginia Medical School', 2004, 'Carilion Family Medicine Residency', 2007,
  true, 'Family Medicine', '2027-06-30',
  'License renewal due June 2026. Malpractice also renews same month — confirm before submitting applications.'
),
(
  'b1000000-0000-0000-0000-000000000003',
  'Aaliyah', 'Patterson', NULL, 'NP',
  '1045678901', 'apatterson@blueridgefm.com', '(540) 555-1103', '1988-11-05', 'F',
  'Family Medicine', NULL, '363L00000X',
  true, true, 'English, French',
  'VA-NP-28301', 'VA', '2028-03-31',
  NULL, '34567890',
  'NSO', 'NSO-2024-44192', '2027-04-30',
  1000000, 3000000,
  'Radford University', 2012, NULL, NULL,
  false, NULL, NULL,
  'Collaborative agreement with Dr. Callahan.'
),
(
  'b1000000-0000-0000-0000-000000000004',
  'Gregory', 'Holt', 'A.', 'DO',
  '1056789012', 'gholt@blueridgefm.com', '(540) 555-1104', '1978-09-19', 'M',
  'Family Medicine', 'Sports Medicine', '207Q00000X',
  false, true, 'English',
  'VA-DO-16741', 'VA', '2025-12-31',   -- EXPIRED
  'AH6204851', '45678901',
  'MMIC Group', 'MMIC-2023-77412', '2025-12-31',  -- EXPIRED
  1000000, 3000000,
  'Edward Via College of Osteopathic Medicine', 2002, 'LewisGale Medical Center Residency', 2005,
  true, 'Family Medicine', '2026-09-30',
  'License and malpractice EXPIRED — renewal in progress. Do not submit new applications.'
),

-- Valley Orthopaedic Associates providers
(
  'b1000000-0000-0000-0000-000000000005',
  'Nathan', 'Kowalski', 'James', 'MD',
  '1067890123', 'nkowalski@valleyortho.com', '(540) 555-2101', '1972-05-30', 'M',
  'Orthopedic Surgery', 'Sports Medicine', '207X00000X',
  true, false, 'English, Polish',
  'VA-MD-11203', 'VA', '2028-06-30',
  'AK7315962', '56789012',
  'ProAssurance', 'PA-2025-91042', '2027-01-31',
  2000000, 4000000,
  'Georgetown University School of Medicine', 1996, 'Johns Hopkins Orthopedic Surgery', 2001,
  true, 'Orthopedic Surgery', '2029-01-31',
  'Subspecialty: total hip and knee replacement.'
),
(
  'b1000000-0000-0000-0000-000000000006',
  'Rebecca', 'Strand', NULL, 'MD',
  '1078901234', 'rstrand@valleyortho.com', '(540) 555-2102', '1982-02-14', 'F',
  'Orthopedic Surgery', NULL, '207X00000X',
  true, false, 'English',
  'VA-MD-21937', 'VA', '2027-08-31',
  'BS8426073', '67890123',
  'The Doctors Company', 'TDC-2025-14033', '2026-08-31',
  2000000, 4000000,
  'University of Maryland School of Medicine', 2006, 'University of Virginia Orthopedic Surgery', 2011,
  true, 'Orthopedic Surgery', '2030-06-30',
  NULL
),
(
  'b1000000-0000-0000-0000-000000000007',
  'Carlos', 'Ruiz', 'Eduardo', 'MD',
  '1089012345', 'cruiz@valleyortho.com', '(540) 555-2103', '1969-08-03', 'M',
  'Physical Medicine and Rehabilitation', NULL, '208100000X',
  true, false, 'English, Spanish',
  'VA-MD-09811', 'VA', '2026-05-31',  -- expiring soon
  NULL, '78901234',
  'MagMutual', 'MM-2025-22814', '2026-05-31',  -- expiring soon
  1000000, 3000000,
  'Universidad de los Andes School of Medicine', 1993, 'MCV/VCU PM&R Residency', 1998,
  true, 'Physical Medicine and Rehabilitation', '2027-05-31',
  'License and malpractice both expire May 2026 — follow up immediately.'
),
(
  'b1000000-0000-0000-0000-000000000008',
  'Susan', 'Fairchild', NULL, 'PA',
  '1090123456', 'sfairchild@valleyortho.com', '(540) 555-2104', '1990-04-27', 'F',
  'Orthopedics', NULL, '363A00000X',
  true, false, 'English',
  'VA-PA-30214', 'VA', '2028-11-30',
  NULL, '89012345',
  'NSO', 'NSO-2025-19304', '2027-12-31',
  1000000, 3000000,
  'James Madison University PA Program', 2014, NULL, NULL,
  false, NULL, NULL,
  'Supervising physician: Dr. Kowalski.'
),

-- Shenandoah Pediatrics providers
(
  'b1000000-0000-0000-0000-000000000009',
  'Michael', 'Osei', 'Kwame', 'MD',
  '1101234567', 'mosei@shenanpeds.com', '(540) 555-3101', '1968-12-18', 'M',
  'Pediatrics', NULL, '208000000X',
  true, true, 'English, Twi',
  'VA-MD-07432', 'VA', '2027-12-31',
  'MO9537184', '90123456',
  'ProAssurance', 'PA-2025-55671', '2027-01-31',
  1000000, 3000000,
  'University of Ghana Medical School', 1992, 'Children''s Hospital of Philadelphia Residency', 1996,
  true, 'Pediatrics', '2028-12-31',
  'Medical director of the group.'
),
(
  'b1000000-0000-0000-0000-000000000010',
  'Tara', 'Desai', NULL, 'MD',
  '1112345678', 'tdesai@shenanpeds.com', '(540) 555-3102', '1985-06-09', 'F',
  'Pediatrics', 'Developmental Pediatrics', '208000000X',
  true, true, 'English, Hindi, Gujarati',
  'VA-MD-24619', 'VA', '2028-09-30',
  'BD1648295', '01234567',
  'Coverys', 'COV-2025-39402', '2026-12-31',
  1000000, 3000000,
  'University of Bombay Grant Medical College', 2009, 'University of Virginia Pediatric Residency', 2012,
  true, 'Pediatrics', '2031-09-30',
  NULL
),
(
  'b1000000-0000-0000-0000-000000000011',
  'Emma', 'Whittaker', 'Rose', 'NP',
  '1123456789', 'ewhittaker@shenanpeds.com', '(540) 555-3103', '1992-03-31', 'F',
  'Pediatrics', NULL, '363L00000X',
  true, true, 'English',
  'VA-NP-34012', 'VA', '2029-03-31',
  NULL, '11223344',
  'NSO', 'NSO-2025-51041', '2028-04-30',
  1000000, 3000000,
  'George Mason University', 2016, NULL, NULL,
  false, NULL, NULL,
  'Collaborative agreement with Dr. Osei.'
),

-- Appalachian Internal Medicine providers
(
  'b1000000-0000-0000-0000-000000000012',
  'Robert', 'Fleming', 'Charles', 'MD',
  '1134567890', 'rfleming@appalachianim.com', '(304) 555-4101', '1970-01-25', 'M',
  'Internal Medicine', 'Geriatrics', '207R00000X',
  true, true, 'English',
  'WV-MD-11048', 'WV', '2027-06-30',
  'BF2759306', '22334455',
  'WVMIC', 'WVM-2024-14022', '2026-07-31',
  1000000, 3000000,
  'West Virginia University School of Medicine', 1994, 'WVU Internal Medicine Residency', 1997,
  true, 'Internal Medicine', '2027-06-30',
  NULL
),
(
  'b1000000-0000-0000-0000-000000000013',
  'Priya', 'Anand', NULL, 'MD',
  '1145678901', 'panand@appalachianim.com', '(304) 555-4102', '1983-10-14', 'F',
  'Internal Medicine', 'Endocrinology', '207R00000X',
  true, false, 'English, Hindi, Tamil',
  'WV-MD-22193', 'WV', '2026-04-30',   -- expiring VERY soon
  'BA3860417', '33445566',
  'ProAssurance', 'PA-2025-78901', '2027-05-31',
  1000000, 3000000,
  'Jawaharlal Institute of Postgraduate Medical Education', 2007, 'Marshall University IM Residency', 2010,
  true, 'Internal Medicine', '2028-10-31',
  'LICENSE EXPIRING THIS MONTH — renewal submitted, awaiting confirmation.'
),
(
  'b1000000-0000-0000-0000-000000000014',
  'Frank', 'Deluca', 'Joseph', 'DO',
  '1156789012', 'fdeluca@appalachianim.com', '(304) 555-4103', '1977-07-08', 'M',
  'Internal Medicine', NULL, '207R00000X',
  false, true, 'English, Italian',
  'WV-DO-16507', 'WV', '2028-01-31',
  'BD4971528', '44556677',
  'WVMIC', 'WVM-2025-21044', '2027-02-28',
  1000000, 3000000,
  'Philadelphia College of Osteopathic Medicine', 2001, 'Roanoke Memorial Internal Medicine Residency', 2004,
  true, 'Internal Medicine', '2027-12-31',
  'Panel currently closed.'
),
(
  'b1000000-0000-0000-0000-000000000015',
  'Angela', 'Morton', NULL, 'NP',
  '1167890123', 'amorton@appalachianim.com', '(304) 555-4104', '1987-09-22', 'F',
  'Internal Medicine', NULL, '363L00000X',
  true, true, 'English',
  'WV-NP-28844', 'WV', '2028-09-30',
  NULL, '55667788',
  'NSO', 'NSO-2025-60193', '2027-10-31',
  1000000, 3000000,
  'West Virginia University School of Nursing', 2013, NULL, NULL,
  false, NULL, NULL,
  NULL
),

-- Summit Women's Health providers
(
  'b1000000-0000-0000-0000-000000000016',
  'Angela', 'Prentiss', 'Marie', 'MD',
  '1178901234', 'aprentiss@summitwomens.com', '(540) 555-5101', '1974-04-11', 'F',
  'Obstetrics and Gynecology', NULL, '207V00000X',
  true, false, 'English',
  'VA-MD-12384', 'VA', '2027-04-30',
  'BP5082639', '66778899',
  'ProAssurance', 'PA-2025-19204', '2027-05-31',
  2000000, 4000000,
  'Duke University School of Medicine', 1998, 'University of Virginia OB/GYN Residency', 2002,
  true, 'Obstetrics and Gynecology', '2029-04-30',
  'CMO and founder.'
),
(
  'b1000000-0000-0000-0000-000000000017',
  'Heather', 'Quinn', 'Elizabeth', 'MD',
  '1189012345', 'hquinn@summitwomens.com', '(540) 555-5102', '1981-08-16', 'F',
  'Obstetrics and Gynecology', 'Maternal-Fetal Medicine', '207V00000X',
  true, false, 'English, French',
  'VA-MD-20913', 'VA', '2028-08-31',
  'BQ6193740', '77889900',
  'The Doctors Company', 'TDC-2025-20815', '2026-09-30',
  2000000, 4000000,
  'Vanderbilt University School of Medicine', 2005, 'Emory OB/GYN Residency', 2009,
  true, 'Obstetrics and Gynecology', '2030-08-31',
  NULL
),
(
  'b1000000-0000-0000-0000-000000000018',
  'Diana', 'Yoon', NULL, 'MD',
  '1190123456', 'dyoon@summitwomens.com', '(540) 555-5103', '1985-02-28', 'F',
  'Obstetrics and Gynecology', NULL, '207V00000X',
  true, false, 'English, Korean',
  'VA-MD-25748', 'VA', '2026-07-31',   -- expiring soon
  'BY7204851', '88990011',
  'MagMutual', 'MM-2025-41302', '2027-08-31',
  2000000, 4000000,
  'Johns Hopkins School of Medicine', 2009, 'George Washington University OB/GYN Residency', 2013,
  true, 'Obstetrics and Gynecology', '2028-02-28',
  NULL
),
(
  'b1000000-0000-0000-0000-000000000019',
  'Courtney', 'Banks', NULL, 'NP',
  '1201234567', 'cbanks@summitwomens.com', '(540) 555-5104', '1991-06-03', 'F',
  'OB/GYN', NULL, '363L00000X',
  true, false, 'English',
  'VA-NP-35901', 'VA', '2029-06-30',
  NULL, '99001122',
  'NSO', 'NSO-2025-70244', '2028-07-31',
  1000000, 3000000,
  'Liberty University School of Nursing', 2015, NULL, NULL,
  false, NULL, NULL,
  'Collaborative agreement with Dr. Prentiss.'
),
(
  'b1000000-0000-0000-0000-000000000020',
  'Marcus', 'Webb', 'Darnell', 'MD',
  '1212345678', 'mwebb@summitwomens.com', '(540) 555-5105', '1976-11-30', 'M',
  'Gynecologic Oncology', NULL, '207VG0400X',
  true, false, 'English',
  'VA-MD-13912', 'VA', '2027-11-30',
  'BW8315962', '00112233',
  'ProAssurance', 'PA-2025-22048', '2027-12-31',
  2000000, 4000000,
  'Howard University College of Medicine', 2000, 'University of North Carolina OB/GYN Residency', 2004,
  true, 'Gynecologic Oncology', '2029-11-30',
  NULL
)
ON CONFLICT (id) DO NOTHING;


-- ── Provider ↔ Group ↔ Location assignments ──────────────────

INSERT INTO provider_group_locations (id, provider_id, group_id, location_id, is_primary, is_active)
VALUES
-- Blue Ridge FM
('f1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', true,  true),
('f1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', false, true),
('f1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', true,  true),
('f1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', false, true),
('f1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', true,  true),
('f1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', true,  true),
-- Valley Ortho
('f1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', true,  true),
('f1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000005', false, true),
('f1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', true,  true),
('f1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', true,  true),
('f1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', true,  true),
-- Shenandoah Peds
('f1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', true,  true),
('f1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000007', true,  true),
('f1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000008', false, true),
('f1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000008', true,  true),
-- Appalachian IM
('f1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000009', true,  true),
('f1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000009', true,  true),
('f1000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000010', false, true),
('f1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000010', true,  true),
('f1000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000009', true,  true),
-- Summit Women's
('f1000000-0000-0000-0000-000000000021', 'b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000011', true,  true),
('f1000000-0000-0000-0000-000000000022', 'b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000011', true,  true),
('f1000000-0000-0000-0000-000000000023', 'b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000012', true,  true),
('f1000000-0000-0000-0000-000000000024', 'b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000011', true,  true),
('f1000000-0000-0000-0000-000000000025', 'b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000011', true,  true)
ON CONFLICT (id) DO NOTHING;


-- ── Enrollment Applications ───────────────────────────────────
-- Mix of statuses across providers and payers

INSERT INTO enrollment_applications (
  id, provider_id, group_id, payer_id,
  location_mode, status, submitted_at, approved_at, effective_date,
  payer_reference, notes
) VALUES
-- Approved applications
('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'all', 'approved', '2025-08-15', '2025-10-02', '2025-10-01', 'ANT-2025-88341', 'Anthem BCBS credentialing complete.'),
('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'all', 'approved', '2025-07-10', '2025-08-20', '2025-09-01', 'AET-2025-44012', NULL),
('e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000007', 'all', 'approved', '2024-11-01', '2025-01-15', '2025-02-01', 'NOV-2025-10039', 'Medicare enrollment via PECOS.'),
('e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004', 'all', 'approved', '2025-06-01', '2025-08-10', '2025-09-01', 'UHC-2025-99201', NULL),
('e1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000006', 'all', 'approved', '2025-01-15', '2025-04-20', '2025-05-01', 'VDM-2025-40211', 'Virginia Medicaid approved.'),
('e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000007', 'all', 'approved', '2024-09-01', '2024-12-03', '2025-01-01', 'NOV-2025-08814', NULL),
('e1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000016', 'a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'all', 'approved', '2025-05-20', '2025-07-14', '2025-08-01', 'ANT-2025-71904', NULL),

-- Submitted applications (waiting for response)
('e1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'all', 'submitted', '2026-02-03', NULL, NULL, 'UHC-2026-12041', 'Submitted Feb 3. Follow up due April 20.'),
('e1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 'all', 'submitted', '2026-01-22', NULL, NULL, 'AET-2026-30814', NULL),
('e1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', 'all', 'submitted', '2026-03-01', NULL, NULL, 'HUM-2026-20193', NULL),
('e1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000008', 'all', 'submitted', '2026-02-14', NULL, NULL, NULL, 'Molina — submitted Feb 14. No reference number issued yet.'),
('e1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000017', 'a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000003', 'all', 'submitted', '2026-03-18', NULL, NULL, 'CGN-2026-58912', NULL),
('e1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000018', 'a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000007', 'all', 'submitted', '2026-01-08', NULL, NULL, 'NOV-2026-03991', 'Medicare — submitted Jan 8. PECOS verified.'),

-- Ready applications (complete, not yet submitted)
('e1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000006', 'all', 'ready', NULL, NULL, NULL, NULL, 'VA Medicaid — CAQH verified, ready to submit.'),
('e1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'selected', 'ready', NULL, NULL, NULL, NULL, NULL),
('e1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000002', 'all', 'ready', NULL, NULL, NULL, NULL, 'Aetna — NP credentialing. Confirm collaborative agreement on file.'),
('e1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000019', 'a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', 'all', 'ready', NULL, NULL, NULL, NULL, NULL),

-- Draft applications (in progress)
('e1000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 'all', 'draft', NULL, NULL, NULL, NULL, 'UHC — NP credentialing in progress. Need collaborative agreement.'),
('e1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000020', 'a1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000009', 'all', 'draft', NULL, NULL, NULL, NULL, NULL),
('e1000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000003', 'all', 'draft', NULL, NULL, NULL, NULL, 'Cigna — panel closed, hold until Dr. Deluca reopens.')
ON CONFLICT (id) DO NOTHING;
