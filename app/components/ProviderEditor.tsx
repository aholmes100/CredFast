'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Provider } from '../types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]

interface Props {
  provider: Provider
}

export default function ProviderEditor({ provider }: Props) {
  const [form, setForm] = useState({
    first_name:               provider.first_name,
    last_name:                provider.last_name,
    npi:                      provider.npi ?? '',
    email:                    provider.email ?? '',
    date_of_birth:            provider.date_of_birth ?? '',
    gender:                   provider.gender ?? '',
    accepting_new_patients:   provider.accepting_new_patients ?? true,
    specialty:                provider.specialty ?? '',
    taxonomy_code:            provider.taxonomy_code ?? '',
    license_number:           provider.license_number ?? '',
    license_state:            provider.license_state ?? '',
    license_expiration:       provider.license_expiration ?? '',
    dea_number:               provider.dea_number ?? '',
    caqh_number:              provider.caqh_number ?? '',
    medicaid_number:          provider.medicaid_number ?? '',
    medicare_number:          provider.medicare_number ?? '',
    malpractice_carrier:      provider.malpractice_carrier ?? '',
    malpractice_policy:       provider.malpractice_policy ?? '',
    malpractice_expiration:   provider.malpractice_expiration ?? '',
    malpractice_per_occurrence: provider.malpractice_per_occurrence?.toString() ?? '',
    malpractice_aggregate:    provider.malpractice_aggregate?.toString() ?? '',
    medical_school:           provider.medical_school ?? '',
    graduation_year:          provider.graduation_year?.toString() ?? '',
    residency_program:        provider.residency_program ?? '',
    residency_completion:     provider.residency_completion?.toString() ?? '',
    fellowship_program:       provider.fellowship_program ?? '',
    fellowship_completion:    provider.fellowship_completion?.toString() ?? '',
    board_certified:          provider.board_certified ?? false,
    board_specialty:          provider.board_specialty ?? '',
    board_expiration:         provider.board_expiration ?? '',
    notes:                    provider.notes ?? '',
  })

  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const set = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.')
      return
    }
    setSaving(true)
    setError(null)
    setJustSaved(false)

    const toNull = (v: string) => v.trim() || null
    const toInt  = (v: string) => v.trim() ? parseInt(v, 10) : null
    const toFloat = (v: string) => v.trim() ? parseFloat(v) : null

    const { error: saveError } = await supabase.from('providers').update({
      first_name:               form.first_name,
      last_name:                form.last_name,
      npi:                      toNull(form.npi),
      email:                    toNull(form.email),
      date_of_birth:            toNull(form.date_of_birth),
      gender:                   toNull(form.gender),
      accepting_new_patients:   form.accepting_new_patients,
      specialty:                toNull(form.specialty),
      taxonomy_code:            toNull(form.taxonomy_code),
      license_number:           toNull(form.license_number),
      license_state:            toNull(form.license_state),
      license_expiration:       toNull(form.license_expiration),
      dea_number:               toNull(form.dea_number),
      caqh_number:              toNull(form.caqh_number),
      medicaid_number:          toNull(form.medicaid_number),
      medicare_number:          toNull(form.medicare_number),
      malpractice_carrier:      toNull(form.malpractice_carrier),
      malpractice_policy:       toNull(form.malpractice_policy),
      malpractice_expiration:   toNull(form.malpractice_expiration),
      malpractice_per_occurrence: toFloat(form.malpractice_per_occurrence),
      malpractice_aggregate:    toFloat(form.malpractice_aggregate),
      medical_school:           toNull(form.medical_school),
      graduation_year:          toInt(form.graduation_year),
      residency_program:        toNull(form.residency_program),
      residency_completion:     toInt(form.residency_completion),
      fellowship_program:       toNull(form.fellowship_program),
      fellowship_completion:    toInt(form.fellowship_completion),
      board_certified:          form.board_certified,
      board_specialty:          toNull(form.board_specialty),
      board_expiration:         toNull(form.board_expiration),
      notes:                    toNull(form.notes),
      updated_at:               new Date().toISOString(),
    }).eq('id', provider.id)

    setSaving(false)
    if (saveError) {
      setError('Failed to save changes. Please try again.')
    } else {
      setIsDirty(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    }
  }

  return (
    <div>
      {/* ── Basic Information ─────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Basic Information</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">First Name</label>
            <input className="form-input" value={form.first_name}
              onChange={(e) => set('first_name', e.target.value)} placeholder="First" />
          </div>
          <div className="form-field">
            <label className="form-label">Last Name</label>
            <input className="form-input" value={form.last_name}
              onChange={(e) => set('last_name', e.target.value)} placeholder="Last" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">NPI Number</label>
            <input className="form-input" value={form.npi}
              onChange={(e) => set('npi', e.target.value)} placeholder="10-digit NPI" />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="provider@example.com" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Date of Birth</label>
            <input className="form-input" type="date" value={form.date_of_birth}
              onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">Gender</label>
            <select className="form-select" value={form.gender}
              onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.accepting_new_patients}
              onChange={(e) => set('accepting_new_patients', e.target.checked)}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>Accepting New Patients</span>
          </label>
        </div>
      </div>

      {/* ── Practice ─────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Practice</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Specialty</label>
            <input className="form-input" value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)} placeholder="e.g. Internal Medicine" />
          </div>
          <div className="form-field">
            <label className="form-label">Taxonomy Code</label>
            <input className="form-input" value={form.taxonomy_code}
              onChange={(e) => set('taxonomy_code', e.target.value)} placeholder="10-digit NUCC code" />
          </div>
        </div>
      </div>

      {/* ── License & Credentials ────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">License &amp; Credentials</p>
        <div className="form-row form-row-2" style={{ marginBottom: '0' }}>
          <div className="form-field">
            <label className="form-label">License Number</label>
            <input className="form-input" value={form.license_number}
              onChange={(e) => set('license_number', e.target.value)} placeholder="State license number" />
          </div>
          <div className="form-field">
            <label className="form-label">License State</label>
            <select className="form-select" value={form.license_state}
              onChange={(e) => set('license_state', e.target.value)}>
              <option value="">Select state</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">License Expiration</label>
            <input className="form-input" type="date" value={form.license_expiration}
              onChange={(e) => set('license_expiration', e.target.value)} />
          </div>
          <div className="form-field">
            <label className="form-label">DEA Number</label>
            <input className="form-input" value={form.dea_number}
              onChange={(e) => set('dea_number', e.target.value)} placeholder="DEA registration number" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">CAQH Number</label>
            <input className="form-input" value={form.caqh_number}
              onChange={(e) => set('caqh_number', e.target.value)} placeholder="CAQH ProView ID" />
          </div>
          <div className="form-field">
            <label className="form-label">Medicaid Number</label>
            <input className="form-input" value={form.medicaid_number}
              onChange={(e) => set('medicaid_number', e.target.value)} placeholder="State Medicaid ID" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Medicare Number (PTAN)</label>
            <input className="form-input" value={form.medicare_number}
              onChange={(e) => set('medicare_number', e.target.value)} placeholder="Provider Transaction Access Number" />
          </div>
          <div />
        </div>
      </div>

      {/* ── Malpractice Insurance ────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Malpractice Insurance</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Insurance Carrier</label>
            <input className="form-input" value={form.malpractice_carrier}
              onChange={(e) => set('malpractice_carrier', e.target.value)} placeholder="Carrier name" />
          </div>
          <div className="form-field">
            <label className="form-label">Policy Number</label>
            <input className="form-input" value={form.malpractice_policy}
              onChange={(e) => set('malpractice_policy', e.target.value)} placeholder="Policy number" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Policy Expiration</label>
            <input className="form-input" type="date" value={form.malpractice_expiration}
              onChange={(e) => set('malpractice_expiration', e.target.value)} />
          </div>
          <div />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Per Occurrence ($)</label>
            <input className="form-input" type="number" value={form.malpractice_per_occurrence}
              onChange={(e) => set('malpractice_per_occurrence', e.target.value)} placeholder="e.g. 1000000" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Aggregate ($)</label>
            <input className="form-input" type="number" value={form.malpractice_aggregate}
              onChange={(e) => set('malpractice_aggregate', e.target.value)} placeholder="e.g. 3000000" />
          </div>
        </div>
      </div>

      {/* ── Education & Training ─────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Education &amp; Training</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Medical School</label>
            <input className="form-input" value={form.medical_school}
              onChange={(e) => set('medical_school', e.target.value)} placeholder="School name" />
          </div>
          <div className="form-field">
            <label className="form-label">Graduation Year</label>
            <input className="form-input" type="number" min={1950} max={2099}
              value={form.graduation_year}
              onChange={(e) => set('graduation_year', e.target.value)} placeholder="YYYY" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Residency Program</label>
            <input className="form-input" value={form.residency_program}
              onChange={(e) => set('residency_program', e.target.value)} placeholder="Program / institution" />
          </div>
          <div className="form-field">
            <label className="form-label">Residency Completion</label>
            <input className="form-input" type="number" min={1950} max={2099}
              value={form.residency_completion}
              onChange={(e) => set('residency_completion', e.target.value)} placeholder="YYYY" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Fellowship Program</label>
            <input className="form-input" value={form.fellowship_program}
              onChange={(e) => set('fellowship_program', e.target.value)} placeholder="Program / institution (if any)" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Fellowship Completion</label>
            <input className="form-input" type="number" min={1950} max={2099}
              value={form.fellowship_completion}
              onChange={(e) => set('fellowship_completion', e.target.value)} placeholder="YYYY" />
          </div>
        </div>
      </div>

      {/* ── Board Certification ──────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Board Certification</p>
        <div className="form-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.board_certified}
              onChange={(e) => set('board_certified', e.target.checked)}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>Board Certified</span>
          </label>
        </div>
        {form.board_certified && (
          <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">Board Specialty</label>
              <input className="form-input" value={form.board_specialty}
                onChange={(e) => set('board_specialty', e.target.value)} placeholder="e.g. Internal Medicine" />
            </div>
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="form-label">Certification Expiration</label>
              <input className="form-input" type="date" value={form.board_expiration}
                onChange={(e) => set('board_expiration', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* ── Notes ────────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <p className="section-label">Notes</p>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <textarea className="form-input" rows={3} value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Internal notes…"
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
        </div>
      </div>

      {/* ── Save Bar ─────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving || !isDirty}
          className={isDirty && !saving ? 'btn btn-primary' : 'btn btn-disabled'}
          style={{ cursor: isDirty && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {justSaved && !saving && (
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>
        )}
        {error && (
          <span style={{ fontSize: '13px', color: '#dc2626' }}>⚠ {error}</span>
        )}
        {isDirty && !saving && !justSaved && (
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
