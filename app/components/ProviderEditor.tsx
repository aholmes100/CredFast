'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Provider, ProviderLicense, ProviderIdentifier } from '../types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]

interface Props {
  provider: Provider
  orgId: string
  initialLicenses: ProviderLicense[]
  initialIdentifiers: ProviderIdentifier[]
}

type LicEditState = {
  id: string
  state: string
  license_number: string
  license_type: string
  status: string
  expiration_date: string
  is_primary: boolean
}

type IdEditState = {
  id: string
  state: string
  identifier_value: string
  effective_date: string
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProviderEditor({ provider, orgId, initialLicenses, initialIdentifiers }: Props) {
  // Note: license_number, license_state, license_expiration, dea_number, medicaid_number, and
  // medicare_number are intentionally excluded from this form — they are now managed via the
  // normalized provider_licenses / provider_identifiers tables below. The DB columns and the
  // Provider type still include them because payer form field mappings in generate-pdf/route.ts
  // may reference them as provider.* paths (e.g. "provider.dea_number").
  const [form, setForm] = useState({
    first_name:               provider.first_name,
    last_name:                provider.last_name,
    middle_name:              provider.middle_name ?? '',
    credential_suffix:        provider.credential_suffix ?? '',
    degree:                   provider.degree ?? '',
    npi:                      provider.npi ?? '',
    email:                    provider.email ?? '',
    phone:                    provider.phone ?? '',
    ssn:                      provider.ssn ?? '',
    ssn_last4:                provider.ssn_last4 ?? '',
    provider_tax_id:          provider.provider_tax_id ?? '',
    date_of_birth:            provider.date_of_birth ?? '',
    gender:                   provider.gender ?? '',
    accepting_new_patients:   provider.accepting_new_patients ?? true,
    specialty:                provider.specialty ?? '',
    secondary_specialty:      provider.secondary_specialty ?? '',
    taxonomy_code:            provider.taxonomy_code ?? '',
    is_pcp:                   provider.is_pcp ?? false,
    languages:                provider.languages ?? '',
    hospital_affiliation:     provider.hospital_affiliation ?? '',
    caqh_number:              provider.caqh_number ?? '',
    malpractice_carrier:      provider.malpractice_carrier ?? '',
    malpractice_policy:       provider.malpractice_policy ?? '',
    malpractice_expiration:   provider.malpractice_expiration ?? '',
    malpractice_per_occurrence: provider.malpractice_per_occurrence?.toString() ?? '',
    malpractice_aggregate:    provider.malpractice_aggregate?.toString() ?? '',
    credentialing_contact_name:  provider.credentialing_contact_name ?? '',
    credentialing_contact_email: provider.credentialing_contact_email ?? '',
    credentialing_contact_phone: provider.credentialing_contact_phone ?? '',
    medical_school:           provider.medical_school ?? '',
    graduation_year:          provider.graduation_year?.toString() ?? '',
    residency_program:        provider.residency_program ?? '',
    residency_completion:     provider.residency_completion?.toString() ?? '',
    fellowship_program:       provider.fellowship_program ?? '',
    fellowship_completion:    provider.fellowship_completion?.toString() ?? '',
    board_certified:          provider.board_certified ?? false,
    board_specialty:          provider.board_specialty ?? '',
    board_expiration:         provider.board_expiration ?? '',
    employment_type:          provider.employment_type ?? '',
    group_start_date:         provider.group_start_date ?? '',
    group_end_date:           provider.group_end_date ?? '',
    home_address_1:           provider.home_address_1 ?? '',
    home_address_2:           provider.home_address_2 ?? '',
    home_city:                provider.home_city ?? '',
    home_state:               provider.home_state ?? '',
    home_zip:                 provider.home_zip ?? '',
    notes:                    provider.notes ?? '',
  })

  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const [licenses,     setLicenses]     = useState<ProviderLicense[]>(initialLicenses)
  const [identifiers,  setIdentifiers]  = useState<ProviderIdentifier[]>(initialIdentifiers)
  const [licEdit,      setLicEdit]      = useState<LicEditState | null>(null)
  const [deaEdit,      setDeaEdit]      = useState<IdEditState | null>(null)
  const [medicaidEdit, setMedicaidEdit] = useState<IdEditState | null>(null)
  const [medicareEdit, setMedicareEdit] = useState<IdEditState | null>(null)
  const [rowSaving,    setRowSaving]    = useState(false)
  const [rowError,     setRowError]     = useState<string | null>(null)

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

    const toNull  = (v: string) => v.trim() || null
    const toInt   = (v: string) => v.trim() ? parseInt(v, 10)  : null
    const toFloat = (v: string) => v.trim() ? parseFloat(v)    : null

    const { error: saveError } = await supabase.from('providers').update({
      first_name:               form.first_name,
      last_name:                form.last_name,
      middle_name:              toNull(form.middle_name),
      credential_suffix:        toNull(form.credential_suffix),
      degree:                   toNull(form.degree),
      npi:                      toNull(form.npi),
      email:                    toNull(form.email),
      phone:                    toNull(form.phone),
      ssn:                      toNull(form.ssn),
      ssn_last4:                toNull(form.ssn_last4),
      provider_tax_id:          toNull(form.provider_tax_id),
      date_of_birth:            toNull(form.date_of_birth),
      gender:                   toNull(form.gender),
      accepting_new_patients:   form.accepting_new_patients,
      specialty:                toNull(form.specialty),
      secondary_specialty:      toNull(form.secondary_specialty),
      taxonomy_code:            toNull(form.taxonomy_code),
      is_pcp:                   form.is_pcp,
      languages:                toNull(form.languages),
      hospital_affiliation:     toNull(form.hospital_affiliation),
      caqh_number:              toNull(form.caqh_number),
      malpractice_carrier:      toNull(form.malpractice_carrier),
      malpractice_policy:       toNull(form.malpractice_policy),
      malpractice_expiration:   toNull(form.malpractice_expiration),
      malpractice_per_occurrence: toFloat(form.malpractice_per_occurrence),
      malpractice_aggregate:    toFloat(form.malpractice_aggregate),
      credentialing_contact_name:  toNull(form.credentialing_contact_name),
      credentialing_contact_email: toNull(form.credentialing_contact_email),
      credentialing_contact_phone: toNull(form.credentialing_contact_phone),
      medical_school:           toNull(form.medical_school),
      graduation_year:          toInt(form.graduation_year),
      residency_program:        toNull(form.residency_program),
      residency_completion:     toInt(form.residency_completion),
      fellowship_program:       toNull(form.fellowship_program),
      fellowship_completion:    toInt(form.fellowship_completion),
      board_certified:          form.board_certified,
      board_specialty:          toNull(form.board_specialty),
      board_expiration:         toNull(form.board_expiration),
      employment_type:          toNull(form.employment_type),
      group_start_date:         toNull(form.group_start_date),
      group_end_date:           toNull(form.group_end_date),
      home_address_1:           toNull(form.home_address_1),
      home_address_2:           toNull(form.home_address_2),
      home_city:                toNull(form.home_city),
      home_state:               toNull(form.home_state),
      home_zip:                 toNull(form.home_zip),
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

  // ── License row handlers ──────────────────────────────────────────────────────

  const handleSaveLicense = async () => {
    if (!licEdit) return
    setRowSaving(true)
    setRowError(null)
    if (!licEdit.state || !licEdit.license_number.trim()) {
      setRowError('State and license number are required.')
      setRowSaving(false)
      return
    }
    const base = {
      organization_id: orgId,
      provider_id:     provider.id,
      state:           licEdit.state,
      license_number:  licEdit.license_number.trim(),
      license_type:    licEdit.license_type.trim(),
      status:          licEdit.status,
      expiration_date: licEdit.expiration_date || null,
      is_primary:      licEdit.is_primary,
    }
    if (licEdit.id === 'new') {
      const { data, error: err } = await supabase
        .from('provider_licenses').insert(base).select().single()
      if (err || !data) { setRowError('Failed to save license.'); setRowSaving(false); return }
      setLicenses(prev => [...prev, data as ProviderLicense])
    } else {
      const { error: err } = await supabase
        .from('provider_licenses')
        .update({ ...base, updated_at: new Date().toISOString() })
        .eq('id', licEdit.id)
      if (err) { setRowError('Failed to save license.'); setRowSaving(false); return }
      setLicenses(prev => prev.map(l =>
        l.id === licEdit.id
          ? { ...l, ...base, updated_at: new Date().toISOString() } as ProviderLicense
          : l
      ))
    }
    setRowSaving(false)
    setLicEdit(null)
  }

  const handleDeleteLicense = async (id: string) => {
    setRowError(null)
    const { error: err } = await supabase.from('provider_licenses').delete().eq('id', id)
    if (err) { setRowError('Failed to delete license.'); return }
    setLicenses(prev => prev.filter(l => l.id !== id))
  }

  // ── Identifier row handlers ───────────────────────────────────────────────────

  const handleSaveIdentifier = async (
    type: 'dea' | 'medicaid' | 'medicare',
    edit: IdEditState,
    setEdit: (v: IdEditState | null) => void
  ) => {
    setRowSaving(true)
    setRowError(null)
    if (!edit.identifier_value.trim()) {
      setRowError('ID value is required.')
      setRowSaving(false)
      return
    }
    const base = {
      organization_id:  orgId,
      provider_id:      provider.id,
      identifier_type:  type,
      state:            edit.state || null,
      identifier_value: edit.identifier_value.trim(),
      effective_date:   edit.effective_date || null,
      is_primary:       false,
    }
    if (edit.id === 'new') {
      const { data, error: err } = await supabase
        .from('provider_identifiers').insert(base).select().single()
      if (err || !data) { setRowError('Failed to save.'); setRowSaving(false); return }
      setIdentifiers(prev => [...prev, data as ProviderIdentifier])
    } else {
      const { error: err } = await supabase
        .from('provider_identifiers').update(base).eq('id', edit.id)
      if (err) { setRowError('Failed to save.'); setRowSaving(false); return }
      setIdentifiers(prev => prev.map(i =>
        i.id === edit.id ? { ...i, ...base } as ProviderIdentifier : i
      ))
    }
    setRowSaving(false)
    setEdit(null)
  }

  const handleDeleteIdentifier = async (id: string) => {
    setRowError(null)
    const { error: err } = await supabase.from('provider_identifiers').delete().eq('id', id)
    if (err) { setRowError('Failed to delete.'); return }
    setIdentifiers(prev => prev.filter(i => i.id !== id))
  }

  // ── Shared inline form for license rows ──────────────────────────────────────

  const renderLicenseForm = (key: string) => (
    <div key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
      <select className="form-select" value={licEdit!.state}
        onChange={e => setLicEdit({ ...licEdit!, state: e.target.value })}
        style={{ width: '78px', minWidth: '78px' }}>
        <option value="">ST</option>
        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <input className="form-input" placeholder="License #"
        value={licEdit!.license_number}
        onChange={e => setLicEdit({ ...licEdit!, license_number: e.target.value })}
        style={{ width: '130px' }} />
      <input className="form-input" placeholder="Type (optional)"
        value={licEdit!.license_type}
        onChange={e => setLicEdit({ ...licEdit!, license_type: e.target.value })}
        style={{ width: '110px' }} />
      <input className="form-input" type="date"
        value={licEdit!.expiration_date}
        onChange={e => setLicEdit({ ...licEdit!, expiration_date: e.target.value })}
        style={{ width: '140px' }} />
      <select className="form-select" value={licEdit!.status}
        onChange={e => setLicEdit({ ...licEdit!, status: e.target.value })}
        style={{ width: '110px' }}>
        <option value="Active">Active</option>
        <option value="Inactive">Inactive</option>
        <option value="Expired">Expired</option>
        <option value="Suspended">Suspended</option>
      </select>
      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#374151', whiteSpace: 'nowrap' }}>
        <input type="checkbox" checked={licEdit!.is_primary}
          onChange={e => setLicEdit({ ...licEdit!, is_primary: e.target.checked })}
          style={{ accentColor: '#4f46e5' }} />
        Primary
      </label>
      <button onClick={handleSaveLicense} disabled={rowSaving}
        className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 10px', height: '34px' }}>
        {rowSaving ? '…' : 'Save'}
      </button>
      <button onClick={() => setLicEdit(null)}
        style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
        Cancel
      </button>
    </div>
  )

  // ── Identifier section renderer ───────────────────────────────────────────────

  function renderIdentifierSection(
    type: 'dea' | 'medicaid' | 'medicare',
    title: string,
    showDate: boolean,
    edit: IdEditState | null,
    setEdit: (v: IdEditState | null) => void
  ) {
    const rows = identifiers.filter(i => i.identifier_type === type)
    const anyEditing = licEdit !== null || deaEdit !== null || medicaidEdit !== null || medicareEdit !== null
    const placeholder = type === 'dea' ? 'DEA Number' : type === 'medicare' ? 'PTAN' : 'Medicaid ID'

    const renderEditRow = (key: string) => (
      <div key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
        <select className="form-select" value={edit!.state}
          onChange={e => setEdit({ ...edit!, state: e.target.value })}
          style={{ width: '78px', minWidth: '78px' }}>
          <option value="">ST</option>
          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="form-input" placeholder={placeholder}
          value={edit!.identifier_value}
          onChange={e => setEdit({ ...edit!, identifier_value: e.target.value })}
          style={{ flex: 1, minWidth: '120px' }} />
        {showDate && (
          <input className="form-input" type="date"
            value={edit!.effective_date}
            onChange={e => setEdit({ ...edit!, effective_date: e.target.value })}
            style={{ width: '140px' }} />
        )}
        <button onClick={() => handleSaveIdentifier(type, edit!, setEdit)} disabled={rowSaving}
          className="btn btn-primary" style={{ fontSize: '12px', padding: '4px 10px', height: '34px' }}>
          {rowSaving ? '…' : 'Save'}
        </button>
        <button onClick={() => setEdit(null)}
          style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
          Cancel
        </button>
      </div>
    )

    return (
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {title}
          </span>
          <button
            onClick={() => setEdit({ id: 'new', state: '', identifier_value: '', effective_date: '' })}
            disabled={anyEditing}
            style={{ fontSize: '12px', color: anyEditing ? '#c7d2fe' : '#4f46e5', background: 'none', border: 'none', cursor: anyEditing ? 'default' : 'pointer', fontWeight: 500, padding: 0 }}>
            + Add
          </button>
        </div>

        {rows.length === 0 && edit?.id !== 'new' && (
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }}>No {title.toLowerCase()} on file.</p>
        )}

        {rows.map(row =>
          edit?.id === row.id
            ? renderEditRow(row.id)
            : (
              <div key={row.id} className="row-list-item" style={{ marginBottom: '4px', padding: '6px 8px' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  {row.state && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', minWidth: '24px', flexShrink: 0 }}>{row.state}</span>
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{row.identifier_value}</span>
                </div>
                {showDate && row.effective_date && (
                  <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(row.effective_date)}</span>
                )}
                <button
                  onClick={() => setEdit({ id: row.id, state: row.state ?? '', identifier_value: row.identifier_value, effective_date: row.effective_date ?? '' })}
                  disabled={anyEditing}
                  style={{ fontSize: '12px', color: anyEditing ? '#c7d2fe' : '#4f46e5', background: 'none', border: 'none', cursor: anyEditing ? 'default' : 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                  Edit
                </button>
                <button onClick={() => handleDeleteIdentifier(row.id)}
                  style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                  Delete
                </button>
              </div>
            )
        )}

        {edit?.id === 'new' && renderEditRow('new')}
      </div>
    )
  }

  const anyEdit = licEdit !== null || deaEdit !== null || medicaidEdit !== null || medicareEdit !== null

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
            <label className="form-label">Middle Name / Initial</label>
            <input className="form-input" value={form.middle_name}
              onChange={(e) => set('middle_name', e.target.value)} placeholder="Middle" />
          </div>
          <div className="form-field">
            <label className="form-label">Credential Suffix</label>
            <input className="form-input" value={form.credential_suffix}
              onChange={(e) => set('credential_suffix', e.target.value)} placeholder="MD, DO, NP, PA…" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Degree</label>
            <input className="form-input" value={form.degree}
              onChange={(e) => set('degree', e.target.value)} placeholder="MD, DO, MSN, MSW, MMS…" />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>
              Academic degree (separate from credential suffix used in name display)
            </p>
          </div>
          <div />
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
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} placeholder="provider@example.com" />
          </div>
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className="form-field">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.accepting_new_patients}
              onChange={(e) => set('accepting_new_patients', e.target.checked)}
              style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>Accepting New Patients</span>
          </label>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Employment Type</label>
            <select className="form-select" value={form.employment_type}
              onChange={(e) => set('employment_type', e.target.value)}>
              <option value="">Select</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Independent Contractor">Independent Contractor</option>
              <option value="Locum Tenens">Locum Tenens</option>
            </select>
          </div>
          <div />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Start Date with Group</label>
            <input className="form-input" type="date" value={form.group_start_date}
              onChange={(e) => set('group_start_date', e.target.value)} />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">End Date with Group</label>
            <input className="form-input" type="date" value={form.group_end_date}
              onChange={(e) => set('group_end_date', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Sensitive Identifiers ─────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Sensitive Identifiers</p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', marginTop: '-4px' }}>
          Stored securely. Restrict access as appropriate for your organization.
        </p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Social Security Number (SSN)</label>
            <input className="form-input" value={form.ssn}
              onChange={(e) => set('ssn', e.target.value)} placeholder="XXX-XX-XXXX" />
          </div>
          <div className="form-field">
            <label className="form-label">Provider Tax ID</label>
            <input className="form-input" value={form.provider_tax_id}
              onChange={(e) => set('provider_tax_id', e.target.value)} placeholder="Individual EIN or SSN for billing" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">SSN (Last 4 only)</label>
            <input className="form-input" value={form.ssn_last4}
              onChange={(e) => set('ssn_last4', e.target.value)} placeholder="XXXX" maxLength={4} />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', marginBottom: 0 }}>
              Use if full SSN is not available
            </p>
          </div>
          <div />
        </div>
      </div>

      {/* ── Practice ─────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Practice</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Primary Specialty</label>
            <input className="form-input" value={form.specialty}
              onChange={(e) => set('specialty', e.target.value)} placeholder="e.g. Internal Medicine" />
          </div>
          <div className="form-field">
            <label className="form-label">Secondary Specialty</label>
            <input className="form-input" value={form.secondary_specialty}
              onChange={(e) => set('secondary_specialty', e.target.value)} placeholder="e.g. Geriatrics" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Taxonomy Code</label>
            <input className="form-input" value={form.taxonomy_code}
              onChange={(e) => set('taxonomy_code', e.target.value)} placeholder="10-digit NUCC code" />
          </div>
          <div className="form-field">
            <label className="form-label">Languages Spoken</label>
            <input className="form-input" value={form.languages}
              onChange={(e) => set('languages', e.target.value)} placeholder="e.g. English, Spanish" />
          </div>
        </div>
        <div className="form-row form-row-2">
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Hospital Affiliation</label>
            <input className="form-input" value={form.hospital_affiliation}
              onChange={(e) => set('hospital_affiliation', e.target.value)} placeholder="Primary hospital name" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '22px' }}>
              <input type="checkbox" checked={form.is_pcp}
                onChange={(e) => set('is_pcp', e.target.checked)}
                style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }} />
              <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>Primary Care Provider (PCP)</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── License & Credentials ────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">License &amp; Credentials</p>

        {/* NPI + CAQH — managed via flat provider columns */}
        <div className="form-row form-row-2" style={{ marginBottom: '20px' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">NPI Number</label>
            <input className="form-input" value={form.npi}
              onChange={(e) => set('npi', e.target.value)} placeholder="10-digit NPI" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">CAQH Number</label>
            <input className="form-input" value={form.caqh_number}
              onChange={(e) => set('caqh_number', e.target.value)} placeholder="CAQH ProView ID" />
          </div>
        </div>

        {/* ── Medical Licenses ─────────────────────────────────── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Medical Licenses
            </span>
            <button
              onClick={() => setLicEdit({ id: 'new', state: '', license_number: '', license_type: '', status: 'Active', expiration_date: '', is_primary: false })}
              disabled={anyEdit}
              style={{ fontSize: '12px', color: anyEdit ? '#c7d2fe' : '#4f46e5', background: 'none', border: 'none', cursor: anyEdit ? 'default' : 'pointer', fontWeight: 500, padding: 0 }}>
              + Add
            </button>
          </div>

          {licenses.length === 0 && licEdit?.id !== 'new' && (
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }}>No licenses on file.</p>
          )}

          {licenses.map(lic =>
            licEdit?.id === lic.id
              ? renderLicenseForm(lic.id)
              : (
                <div key={lic.id} className="row-list-item" style={{ marginBottom: '4px', padding: '6px 8px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                      {lic.state} — {lic.license_number}
                    </span>
                    {lic.is_primary && (
                      <span style={{ fontSize: '10px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600, whiteSpace: 'nowrap' }}>Primary</span>
                    )}
                    {lic.license_type && (
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{lic.license_type}</span>
                    )}
                  </div>
                  {lic.expiration_date && (
                    <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(lic.expiration_date)}</span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', backgroundColor: lic.status === 'Active' ? '#f0fdf4' : '#fef2f2', color: lic.status === 'Active' ? '#15803d' : '#b91c1c' }}>
                    {lic.status}
                  </span>
                  <button
                    onClick={() => setLicEdit({ id: lic.id, state: lic.state, license_number: lic.license_number, license_type: lic.license_type ?? '', status: lic.status, expiration_date: lic.expiration_date ?? '', is_primary: lic.is_primary })}
                    disabled={anyEdit}
                    style={{ fontSize: '12px', color: anyEdit ? '#c7d2fe' : '#4f46e5', background: 'none', border: 'none', cursor: anyEdit ? 'default' : 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeleteLicense(lic.id)}
                    style={{ fontSize: '12px', color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}>
                    Delete
                  </button>
                </div>
              )
          )}

          {licEdit?.id === 'new' && renderLicenseForm('new')}
        </div>

        {renderIdentifierSection('dea',      'DEA Registrations', true,  deaEdit,      setDeaEdit)}
        {renderIdentifierSection('medicaid', 'Medicaid IDs',      false, medicaidEdit, setMedicaidEdit)}
        {renderIdentifierSection('medicare', 'Medicare PTANs',    false, medicareEdit, setMedicareEdit)}

        {rowError && (
          <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', marginBottom: 0 }}>{rowError}</p>
        )}
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

      {/* ── Credentialing Contact ────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Credentialing Contact</p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', marginTop: '-4px' }}>
          The person at this practice responsible for credentialing correspondence
        </p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Contact Name</label>
            <input className="form-input" value={form.credentialing_contact_name}
              onChange={(e) => set('credentialing_contact_name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-field">
            <label className="form-label">Contact Phone</label>
            <input className="form-input" type="tel" value={form.credentialing_contact_phone}
              onChange={(e) => set('credentialing_contact_phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Contact Email</label>
            <input className="form-input" type="email" value={form.credentialing_contact_email}
              onChange={(e) => set('credentialing_contact_email', e.target.value)} placeholder="cred@practice.com" />
          </div>
          <div />
        </div>
      </div>

      {/* ── Home Address ──────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Home Address</p>
        <div className="form-field">
          <label className="form-label">Address Line 1</label>
          <input className="form-input" value={form.home_address_1}
            onChange={(e) => set('home_address_1', e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="form-field">
          <label className="form-label">Address Line 2</label>
          <input className="form-input" value={form.home_address_2}
            onChange={(e) => set('home_address_2', e.target.value)} placeholder="Apt, unit, etc." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', gap: '10px', marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">City</label>
            <input className="form-input" value={form.home_city}
              onChange={(e) => set('home_city', e.target.value)} placeholder="City" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">State</label>
            <select className="form-select" value={form.home_state}
              onChange={(e) => set('home_state', e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">ZIP</label>
            <input className="form-input" value={form.home_zip}
              onChange={(e) => set('home_zip', e.target.value)} placeholder="78701" />
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
