'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// ── Field display name lookup ────────────────────────────────────────────────

export const FIELD_LABELS: Record<string, Record<string, string>> = {
  provider: {
    full_name:                    'Full Name',
    middle_initial:               'Middle Initial',
    first_name:                   'First Name',
    last_name:                    'Last Name',
    middle_name:                  'Middle Name',
    credential_suffix:            'Title',
    npi:                          'Provider NPI',
    email:                        'Email Address',
    phone:                        'Phone Number',
    date_of_birth:                'Date of Birth',
    gender:                       'Gender',
    ssn:                          'Social Security Number',
    provider_tax_id:              'Individual Tax ID',
    specialty:                    'Primary Specialty',
    secondary_specialty:          'Secondary Specialty',
    taxonomy_code:                'Taxonomy Code',
    languages:                    'Languages Spoken',
    hospital_affiliation:         'Hospital Affiliation',
    is_pcp:                       'Is PCP',
    is_pcp_yes:                   'Is PCP (Yes)',
    is_pcp_no:                    'Is PCP (No)',
    accepting_new_patients:       'Accepting New Patients',
    accepting_new_patients_yes:   'Accepting New Patients (Yes)',
    accepting_new_patients_no:    'Accepting New Patients (No)',
    license_number:               'License Number',
    license_state:                'License State',
    license_expiration:           'License Expiration Date',
    dea_number:                   'DEA Number',
    caqh_number:                  'CAQH Number',
    medicaid_number:              'Medicaid ID',
    medicare_number:              'Medicare PTAN',
    malpractice_carrier:          'Malpractice Carrier',
    malpractice_policy:           'Malpractice Policy Number',
    malpractice_expiration:       'Malpractice Expiration Date',
    malpractice_per_occurrence:   'Malpractice Per Occ',
    malpractice_aggregate:        'Malpractice Aggregate',
    medical_school:               'Medical School',
    graduation_year:              'Medical School Graduation Year',
    residency_program:            'Residency Program',
    residency_completion:         'Residency Completion Year',
    fellowship_program:           'Fellowship Program',
    fellowship_completion:        'Fellowship Completion Year',
    board_certified:              'Board Certified',
    board_specialty:              'Board Certification Specialty',
    board_expiration:             'Board Certification Expiration',
  },
  group: {
    name:                         'Practice Name',
    legal_name:                   'Legal Business Name',
    tax_id:                       'Tax ID',
    group_npi:                    'Group NPI',
    taxonomy_code:                'Group Taxonomy Code',
    medicaid_group_number:        'Medicaid Group Number',
    medicare_group_number:        'Medicare Group Number',
    practice_type:                'Practice Type',
    authorized_official_name:     'Authorized Official Name',
    authorized_official_title:    'Authorized Official Title',
    authorized_official_phone:    'Authorized Official Phone',
    authorized_official_email:    'Authorized Official Email',
    credentialing_contact_name:   'Credentialing Contact Name',
    credentialing_contact_email:  'Credentialing Contact Email',
    credentialing_contact_phone:  'Credentialing Contact Phone',
    credentialing_contact_fax:    'Credentialing Contact Fax',
    billing_name:                 'Billing Name',
    billing_address_1:            'Billing Address',
    billing_address_2:            'Billing Address Line 2',
    billing_city:                 'Billing City',
    billing_state:                'Billing State',
    billing_zip:                  'Billing ZIP Code',
    billing_phone:                'Billing Phone',
    billing_fax:                  'Billing Fax',
  },
  location: {
    name:                'Location Name',
    address_1:           'Street Address',
    address_2:           'Address Line 2',
    city:                'City',
    state:               'State',
    zip:                 'ZIP Code',
    county:              'County',
    mailing_address_1:   'Mailing Address',
    mailing_address_2:   'Mailing Address Line 2',
    mailing_city:        'Mailing City',
    mailing_state:       'Mailing State',
    mailing_zip:         'Mailing ZIP Code',
    phone:               'Office Phone',
    fax:                 'Office Fax',
    facility_type:       'Facility Type',
    accepts_new_patients:'Accepting New Patients',
    handicap_accessible: 'Handicap Accessible',
    accepts_medicaid:    'Accepts Medicaid',
    accepts_medicare:    'Accepts Medicare',
    hours_mon_fri:       'Office Hours (Mon-Fri)',
    hours_weekend:       'Office Hours (Weekend)',
  },
  application: {
    status:           'Application Status',
    submitted_at:     'Date Submitted',
    approved_at:      'Date Approved',
    effective_date:   'Effective Date',
    payer_reference:  'Payer Reference Number',
  },
  static: {
    overflow: 'See Attached Letter',
  },
}

export const LOCATION_SLOT_LABELS = ['Primary (1st)', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5']

const CATEGORY_LABELS: Record<string, string> = {
  provider: 'Provider',
  group: 'Group',
  location: 'Location',
  application: 'Application',
  static: 'Static',
}

// ── Public helpers ─────────────────────────────────────────────────────────

/** Returns the friendly display name for a single `{category.field}` token. */
export function tokenDisplayName(token: string): string {
  const m = token.match(/^\{([^}]+)\}$/)
  if (!m) {
    // Not a single-token wrapper — return just the last path segment
    const path = token.replace(/\|separator=.*$/, '').replace(/^\{/, '').replace(/\}$/, '')
    const parts = path.split('.')
    return parts[parts.length - 1]
  }
  const path = m[1].replace(/\|separator=.*$/, '')
  const parts = path.split('.')
  if (parts.length < 2) return path
  const cat = parts[0]
  if (cat === 'location' && parts.length >= 3) {
    const field = parts.slice(2).join('.')
    return FIELD_LABELS.location?.[field] ?? field
  }
  const field = parts.slice(1).join('.')
  return FIELD_LABELS[cat]?.[field] ?? field
}

// ── Template parsing ───────────────────────────────────────────────────────

interface ParsedTemplate {
  prefix: string
  tokens: string[]
  separator: string
  suffix: string
}

/**
 * Tries to decompose a template string into {prefix, tokens[], separator, suffix}.
 * Returns null if:
 *  - the template uses array expansion ([*]) or pipe operators
 *  - inter-token separators are inconsistent
 *
 * Null signals "show in advanced mode, and do NOT offer a Simple toggle."
 */
function parseTemplate(template: string): ParsedTemplate | null {
  if (/\[\*\]/.test(template)) return null

  const tokenRegex = /\{[^}]+\}/g
  const allMatches = [...template.matchAll(tokenRegex)]

  if (allMatches.length === 0) {
    return { prefix: template, tokens: [], separator: ' ', suffix: '' }
  }

  const tokens = allMatches.map(m => m[0])
  const gaps: string[] = []
  let lastEnd = 0
  for (const match of allMatches) {
    gaps.push(template.slice(lastEnd, match.index!))
    lastEnd = match.index! + match[0].length
  }
  gaps.push(template.slice(lastEnd))

  const prefix = gaps[0]
  const suffix = gaps[gaps.length - 1]
  const separators = gaps.slice(1, -1)
  const separator = separators.length > 0 ? separators[0] : ' '

  if (!separators.every(s => s === separator)) return null

  return { prefix, tokens, separator, suffix }
}

/** Returns parsed result only if reassembling produces byte-for-byte the original string. */
function canRoundTrip(value: string): ParsedTemplate | null {
  const parsed = parseTemplate(value)
  if (!parsed) return null
  return parsed.prefix + parsed.tokens.join(parsed.separator) + parsed.suffix === value
    ? parsed
    : null
}

function buildTokenString(cat: string, slot: number, field: string): string {
  return cat === 'location' ? `{location.${slot}.${field}}` : `{${cat}.${field}}`
}

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  value: string
  onChange: (template: string) => void
}

export default function TemplateFieldPicker({ value, onChange }: Props) {
  // Initialize state from value on mount (useState(() => ...) runs once)
  const initParsed = canRoundTrip(value)

  const [mode, setMode]           = useState<'simple' | 'advanced'>(() => initParsed ? 'simple' : 'advanced')
  const [tokens, setTokens]       = useState<string[]>(() => initParsed?.tokens ?? [])
  const [separator, setSeparator] = useState<string>(()  => initParsed?.separator ?? ' ')
  const [prefix, setPrefix]       = useState<string>(()  => initParsed?.prefix ?? '')
  const [suffix, setSuffix]       = useState<string>(()  => initParsed?.suffix ?? '')

  // Picker UI state for the "add a token" row
  const [pickerCat,   setPickerCat]   = useState('provider')
  const [pickerSlot,  setPickerSlot]  = useState(0)
  const [pickerField, setPickerField] = useState(() => Object.keys(FIELD_LABELS.provider)[0] ?? '')

  // Refs for change-origin tracking
  const onChangeRef    = useRef(onChange)
  onChangeRef.current  = onChange           // always up to date, no effect re-runs needed

  const prevValueRef    = useRef(value)     // last value received from parent
  const lastEmittedRef  = useRef(value)     // last value we sent to parent
  const isMountedRef    = useRef(false)     // skip first emit-effect run

  // ── Sync from parent (useLayoutEffect → no visible flash) ─────────────
  // When selectedKey changes in PdfFieldMapper, value prop changes externally.
  // We reinitialize before the browser paints so the user sees correct state immediately.
  useLayoutEffect(() => {
    if (value === prevValueRef.current) return
    prevValueRef.current = value
    // Was this value our own emit? If so, no reinit needed.
    if (value === lastEmittedRef.current) return
    // Genuine external change — reinitialize picker state
    const parsed = canRoundTrip(value)
    if (parsed) {
      setTokens(parsed.tokens)
      setSeparator(parsed.separator)
      setPrefix(parsed.prefix)
      setSuffix(parsed.suffix)
      setMode('simple')
    } else {
      setMode('advanced')
    }
  }, [value])

  // ── Emit to parent when simple-mode state changes ─────────────────────
  useEffect(() => {
    if (!isMountedRef.current) { isMountedRef.current = true; return }
    if (mode !== 'simple') return
    const t = prefix + tokens.join(separator) + suffix
    lastEmittedRef.current = t
    prevValueRef.current   = t   // pre-mark so the layout effect skips it
    onChangeRef.current(t)
  // onChange intentionally excluded — accessed via ref above
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, separator, prefix, suffix, mode])

  // ── Helpers ────────────────────────────────────────────────────────────
  const addToken = () => {
    setTokens(prev => [...prev, buildTokenString(pickerCat, pickerSlot, pickerField)])
  }

  const removeToken = (i: number) =>
    setTokens(prev => prev.filter((_, j) => j !== i))

  const moveToken = (i: number, dir: -1 | 1) => {
    setTokens(prev => {
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const a = [...prev];
      [a[i], a[j]] = [a[j], a[i]]
      return a
    })
  }

  const handlePickerCatChange = (cat: string) => {
    setPickerCat(cat)
    setPickerSlot(0)
    setPickerField(Object.keys(FIELD_LABELS[cat] ?? {})[0] ?? '')
  }

  const switchToSimple = () => {
    const parsed = canRoundTrip(value)!
    setTokens(parsed.tokens)
    setSeparator(parsed.separator)
    setPrefix(parsed.prefix)
    setSuffix(parsed.suffix)
    setMode('simple')
  }

  const builtTemplate    = prefix + tokens.join(separator) + suffix
  const canGoSimple      = mode === 'advanced' && canRoundTrip(value) !== null
  const pickerFields     = FIELD_LABELS[pickerCat] ?? {}

  // ── Advanced mode ──────────────────────────────────────────────────────
  if (mode === 'advanced') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Template</label>
          {canGoSimple && (
            <button
              type="button"
              onClick={switchToSimple}
              style={{ fontSize: '11px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
            >
              ↑ Simple
            </button>
          )}
        </div>
        <input
          className="form-input"
          type="text"
          value={value}
          onChange={e => {
            const t = e.target.value
            lastEmittedRef.current = t
            prevValueRef.current   = t
            onChangeRef.current(t)
          }}
          style={{ fontFamily: 'monospace', fontSize: '12px' }}
          placeholder="{provider.first_name}"
        />
      </div>
    )
  }

  // ── Simple mode ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

      {/* Row: category + [slot] + field + add button */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={pickerCat}
            onChange={e => handlePickerCatChange(e.target.value)}
            style={{ fontSize: '11px' }}
          >
            {Object.keys(CATEGORY_LABELS).map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        {pickerCat === 'location' && (
          <div>
            <label className="form-label">Slot</label>
            <select
              className="form-select"
              value={pickerSlot}
              onChange={e => setPickerSlot(Number(e.target.value))}
              style={{ fontSize: '11px' }}
            >
              {LOCATION_SLOT_LABELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1, minWidth: '100px' }}>
          <label className="form-label">Field</label>
          <select
            className="form-select"
            value={pickerField}
            onChange={e => setPickerField(e.target.value)}
            style={{ fontSize: '11px' }}
          >
            {Object.entries(pickerFields).map(([field, label]) => (
              <option key={field} value={field}>{label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={addToken}
          style={{
            alignSelf: 'flex-end', height: 32, padding: '0 10px',
            backgroundColor: '#4f46e5', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontSize: '14px', fontWeight: 700, lineHeight: 1,
          }}
        >＋</button>
      </div>

      {/* Token chips */}
      {tokens.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {tokens.map((tok, i) => (
            <div
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '2px',
                backgroundColor: '#eef2ff', color: '#4338ca',
                borderRadius: '5px', padding: '3px 5px 3px 8px',
                fontSize: '11px', fontWeight: 500, border: '1px solid #c7d2fe',
              }}
            >
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tokenDisplayName(tok)}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '2px' }}>
                <button
                  type="button"
                  onClick={() => moveToken(i, -1)}
                  disabled={i === 0}
                  style={{
                    background: 'none', border: 'none',
                    cursor: i === 0 ? 'default' : 'pointer',
                    color: i === 0 ? '#c7d2fe' : '#818cf8',
                    fontSize: '7px', padding: 0, lineHeight: 1, height: 9,
                    display: 'flex', alignItems: 'center',
                  }}
                >▲</button>
                <button
                  type="button"
                  onClick={() => moveToken(i, 1)}
                  disabled={i === tokens.length - 1}
                  style={{
                    background: 'none', border: 'none',
                    cursor: i === tokens.length - 1 ? 'default' : 'pointer',
                    color: i === tokens.length - 1 ? '#c7d2fe' : '#818cf8',
                    fontSize: '7px', padding: 0, lineHeight: 1, height: 9,
                    display: 'flex', alignItems: 'center',
                  }}
                >▼</button>
              </div>
              <button
                type="button"
                onClick={() => removeToken(i)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#a5b4fc', fontSize: '13px', padding: '0 2px',
                  lineHeight: 1, marginLeft: '1px',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Prefix / Suffix */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        <div>
          <label className="form-label">Prefix</label>
          <input
            className="form-input"
            type="text"
            value={prefix}
            onChange={e => setPrefix(e.target.value)}
            placeholder='e.g. "Dr. "'
            style={{ fontSize: '12px' }}
          />
        </div>
        <div>
          <label className="form-label">Suffix</label>
          <input
            className="form-input"
            type="text"
            value={suffix}
            onChange={e => setSuffix(e.target.value)}
            placeholder="optional"
            style={{ fontSize: '12px' }}
          />
        </div>
      </div>

      {/* Separator (only relevant when multiple tokens) */}
      {tokens.length > 1 && (
        <div style={{ width: '90px' }}>
          <label className="form-label">Separator</label>
          <input
            className="form-input"
            type="text"
            value={separator}
            onChange={e => setSeparator(e.target.value)}
            style={{ fontSize: '12px', fontFamily: 'monospace' }}
          />
        </div>
      )}

      {/* Template preview */}
      {builtTemplate.length > 0 && (
        <div style={{
          backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: '5px', padding: '5px 8px',
          fontSize: '11px', fontFamily: 'monospace', color: '#64748b',
          wordBreak: 'break-all', lineHeight: 1.5,
        }}>
          {builtTemplate}
        </div>
      )}

      {/* Advanced toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => setMode('advanced')}
          style={{
            fontSize: '11px', color: '#94a3b8',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          Advanced ▾
        </button>
      </div>
    </div>
  )
}
