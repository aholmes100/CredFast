// ============================================================
// Domain types — mirror the Supabase schema (v2 with credential fields)
// ============================================================

export type ApplicationStatus = 'draft' | 'ready' | 'submitted' | 'approved'
export type LocationMode = 'all' | 'selected'

export interface Provider {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  credential_suffix: string | null    // MD, DO, NP, PA, etc.
  npi: string | null
  email: string | null
  phone: string | null
  ssn: string | null                  // full SSN
  provider_tax_id: string | null      // individual tax ID (distinct from group EIN)
  // Identity
  date_of_birth: string | null        // ISO date string
  gender: string | null
  // Practice
  specialty: string | null
  secondary_specialty: string | null
  taxonomy_code: string | null
  accepting_new_patients: boolean | null
  is_pcp: boolean | null
  languages: string | null
  hospital_affiliation: string | null
  // Identifiers
  license_number: string | null
  license_state: string | null
  license_expiration: string | null   // ISO date
  dea_number: string | null
  caqh_number: string | null
  medicaid_number: string | null
  medicare_number: string | null      // PTAN
  // Malpractice
  malpractice_carrier: string | null
  malpractice_policy: string | null
  malpractice_expiration: string | null
  malpractice_per_occurrence: number | null
  malpractice_aggregate: number | null
  // Education
  medical_school: string | null
  graduation_year: number | null
  residency_program: string | null
  residency_completion: number | null
  fellowship_program: string | null
  fellowship_completion: number | null
  // Board certification
  board_certified: boolean | null
  board_specialty: string | null
  board_expiration: string | null
  // Misc
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface Group {
  id: string
  name: string
  legal_name: string | null
  tax_id: string | null
  group_npi: string | null
  taxonomy_code: string | null
  medicaid_group_number: string | null
  medicare_group_number: string | null
  practice_type: string | null
  authorized_official_name: string | null
  authorized_official_title: string | null
  authorized_official_phone: string | null
  authorized_official_email: string | null
  // Credentialing contact (may differ from authorized official)
  credentialing_contact_name: string | null
  credentialing_contact_email: string | null
  credentialing_contact_phone: string | null
  credentialing_contact_fax: string | null
  // Billing address (may differ from service address)
  billing_name: string | null
  billing_address_1: string | null
  billing_address_2: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  billing_phone: string | null
  billing_fax: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface Location {
  id: string
  group_id: string | null
  name: string
  address_1: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  county: string | null
  phone: string | null
  fax: string | null
  facility_type: string | null
  accepts_new_patients: boolean | null
  handicap_accessible: boolean | null
  accepts_medicaid: boolean | null
  accepts_medicare: boolean | null
  group_npi_override: string | null
  hours_mon_fri: string | null
  hours_weekend: string | null
  hours_monday:    string | null
  hours_tuesday:   string | null
  hours_wednesday: string | null
  hours_thursday:  string | null
  hours_friday:    string | null
  hours_saturday:  string | null
  hours_sunday:    string | null
  // Mailing address (may differ from physical/service address)
  mailing_address_1: string | null
  mailing_address_2: string | null
  mailing_city: string | null
  mailing_state: string | null
  mailing_zip: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface Payer {
  id: string
  name: string
  payer_id_code: string | null
  enrollment_phone: string | null
  enrollment_fax: string | null
  enrollment_address: string | null
  enrollment_url: string | null
  processing_days: number | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ProviderGroupLocation {
  id: string
  provider_id: string
  group_id: string
  location_id: string
  is_primary: boolean
  is_active: boolean
  created_at: string
}

export interface EnrollmentApplication {
  id: string
  provider_id: string
  group_id: string
  payer_id: string
  location_mode: LocationMode
  status: ApplicationStatus
  submitted_at: string | null
  approved_at: string | null
  effective_date: string | null
  payer_reference: string | null
  notes: string | null
  enrollment_id: string | null   // FK to provider_payer_enrollments (migration 17)
  created_at: string
  updated_at: string | null
}

export interface EnrollmentApplicationLocation {
  id: string
  enrollment_application_id: string
  location_id: string
}

// ============================================================
// New tables (added in v2 migration)
// ============================================================

/**
 * Per-field mapping value: template string + font size.
 * Plain string values (legacy) are accepted wherever this type is expected and
 * are normalized at read-time to { template: value, fontSize: <coord key size | 10> }.
 *
 * Template syntax:
 *   Literal text mixed with {token} references:
 *     "{provider.first_name} {provider.last_name}, {provider.credential_suffix}"
 *     "{location.0.address_1}, {location.0.city}, {location.0.state} {location.0.zip}"
 *   Array expansion (joins all items in an array field):
 *     "{provider.taxonomies[*].code}"
 *   Array expansion with custom separator:
 *     "{provider.taxonomies[*].code|separator=; }"
 *   A plain path with no {…} tokens is resolved by the legacy resolvePath function.
 */
export interface FieldMappingValue {
  template: string
  fontSize: number
}

/**
 * field_mappings format:
 *   { "PDF_FieldName": "provider.npi", "TaxID": "group.tax_id", ... }  ← legacy plain string
 *   { "120,650,10": { template: "{provider.npi}", fontSize: 10 } }      ← new FieldMappingValue
 *
 * Both forms coexist in the same record; normalizeMapping() in route.ts handles the union.
 *
 * Supported data path prefixes in templates / plain paths:
 *   provider.*      → Provider columns
 *   group.*         → Group columns
 *   location.field  → Primary location (index 0) — legacy format
 *   location.N.field→ Location at slot index N (0 = primary, 1 = 2nd, etc.)
 *   application.*   → EnrollmentApplication columns
 *   static.overflow → Resolves to overflow_text when location count exceeds slot count
 */
export interface PayerForm {
  id: string
  payer_id: string | null
  name: string
  description: string | null
  storage_path: string | null
  field_mappings: Record<string, string | FieldMappingValue>
  // Multi-location config (added in migration 16)
  pdf_type: 'single' | 'fixed' | 'repeating'
  repeating_page_index: number | null   // 0-indexed page that clones for overflow locations
  locations_per_page: number            // location slots per repeating page (default 2)
  static_pages: number[] | null         // 0-indexed pages filled once (not cloned)
  location_slot_count: number | null    // for 'fixed': max slots before overflow
  overflow_text: string                 // for 'fixed': text placed in overflow slot
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface ApplicationDocument {
  id: string
  enrollment_application_id: string
  payer_form_id: string | null
  storage_path: string
  generated_at: string
  generated_by: string | null
}

// ============================================================
// Query result shapes — Supabase join return types
// ============================================================

export interface ApplicationWithRelations extends EnrollmentApplication {
  providers: Pick<Provider, 'first_name' | 'last_name'> | null
  groups: Pick<Group, 'name'> | null
  payers: Pick<Payer, 'name'> | null
}

export interface LocationWithGroup extends Location {
  groups: Pick<Group, 'name'> | null
}

export interface AssignmentWithRelations extends ProviderGroupLocation {
  providers: Pick<Provider, 'first_name' | 'last_name'> | null
  groups: Pick<Group, 'name'> | null
  locations: Pick<Location, 'name'> | null
}

export interface ApplicationLocationRow {
  locations: Pick<Location, 'id' | 'name' | 'address_1' | 'city' | 'state' | 'zip'> | null
}

export interface PayerFormWithPayer extends PayerForm {
  payers: Pick<Payer, 'name'> | null
}

// ============================================================
// Roster templates
// ============================================================

export interface RosterTemplate {
  id: string
  organization_id: string
  payer_id: string | null
  name: string
  file_path: string
  file_name: string
  sheet_name: string
  header_row: number
  column_mappings: Record<string, string>
  created_at: string
  updated_at: string
}

export interface RosterTemplateWithPayer extends RosterTemplate {
  payers: Pick<Payer, 'name'> | null
}

// ============================================================
// PDF generation payload — assembled before filling a form
// ============================================================
export interface PdfFillPayload {
  provider: Provider
  group: Group
  locations: Location[]
  application: EnrollmentApplication
  overflow_text: string   // from payer_forms.overflow_text; used by static.overflow path
}

// ============================================================
// Validation
// ============================================================
export interface ValidationIssue {
  field: string
  label: string
  severity: 'error' | 'warning'
}

// ============================================================
// Phase 1 normalized tables (provider_licenses etc.)
// ============================================================

export interface ProviderLicense {
  id: string
  provider_id: string
  state: string
  license_number: string
  license_type: string
  status: string
  issue_date: string | null
  expiration_date: string | null
  is_primary: boolean
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ProviderMalpractice {
  id: string
  provider_id: string
  carrier: string
  policy_number: string | null
  coverage_type: string
  per_occurrence: number | null
  aggregate: number | null
  effective_date: string | null
  expiration_date: string | null
  is_current: boolean
  tail_coverage_obtained: boolean | null
  tail_carrier: string | null
  tail_expiration: string | null
  carrier_phone: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface ProviderBoardCertification {
  id: string
  provider_id: string
  certifying_board: string
  specialty: string
  certification_number: string | null
  initial_certification_date: string | null
  expiration_date: string | null
  status: string
  is_moc_current: boolean
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

// ============================================================
// Phase 2 workflow tables
// ============================================================

export interface ApplicationTask {
  id: string
  enrollment_application_id: string
  task_type: string
  title: string
  description: string | null
  assigned_to: string | null
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  sort_order: number
  created_at: string
  created_by: string | null
  updated_at: string | null
}

export interface InternalNote {
  id: string
  entity_type: string
  entity_id: string
  note: string
  is_pinned: boolean
  created_at: string
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
}

export interface FollowUpEntry {
  id: string
  enrollment_application_id: string
  contact_method: string
  contact_name: string | null
  contact_role: string | null
  summary: string
  outcome: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  logged_at: string
  logged_by: string | null
}

export interface Reminder {
  id: string
  entity_type: string
  entity_id: string
  reminder_type: string
  title: string
  due_date: string
  assigned_to: string | null
  is_dismissed: boolean
  dismissed_at: string | null
  dismissed_by: string | null
  auto_generated: boolean
  created_at: string
}

// ============================================================
// Phase 2 unified document store
// ============================================================

export type DocumentEntityType = 'provider' | 'group' | 'location' | 'payer' | 'application'

export interface Document {
  id: string
  entity_type: DocumentEntityType
  entity_id: string
  document_type: string
  label: string | null
  file_name: string
  storage_path: string
  file_size_bytes: number | null
  mime_type: string
  expiration_date: string | null
  effective_date: string | null
  is_current: boolean
  requires_renewal: boolean
  uploaded_at: string
  uploaded_by: string | null
  notes: string | null
  metadata: Record<string, unknown>
  import_batch_id: string | null
}

// ============================================================
// Phase 2 enrollment outcome
// ============================================================

export interface PayerParticipation {
  id: string
  provider_id: string
  group_id: string | null
  payer_id: string
  enrollment_application_id: string | null
  payer_provider_id: string | null
  network_name: string | null
  contract_type: string | null
  effective_date: string | null
  termination_date: string | null
  is_active: boolean
  re_credentialing_due: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export interface EnrollmentStatusHistoryEntry {
  id: string
  enrollment_application_id: string
  status: string
  changed_at: string
  changed_by: string | null
  notes: string | null
}

// ============================================================
// Enrollment tracking (migration 17)
// ============================================================

export type EnrollmentStatus = 'in_queue' | 'in_progress' | 'enrolled' | 'inactive'
export type EnrollmentNextAction = 'follow_up' | 'submit' | 'awaiting_approval' | 'none'

export interface ProviderPayerEnrollment {
  id: string
  organization_id: string | null
  provider_id: string
  payer_id: string
  status: EnrollmentStatus
  next_action: EnrollmentNextAction
  assigned_to: string | null
  next_follow_up_date: string | null
  submitted_at: string | null
  approved_at: string | null
  effective_date: string | null
  created_at: string
  updated_at: string | null
}

export interface EnrollmentActivityLog {
  id: string
  enrollment_id: string
  organization_id: string | null
  author_id: string | null
  note: string
  created_at: string
}

export interface EnrollmentWithPayer extends ProviderPayerEnrollment {
  payers: Pick<Payer, 'id' | 'name'> | null
}

export interface TeamMember {
  id: string
  display_name: string | null
}
