'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Group } from '../types'

interface Props {
  group: Group
}

export default function GroupEditor({ group }: Props) {
  const [form, setForm] = useState({
    name:                           group.name,
    legal_name:                     group.legal_name ?? '',
    tax_id:                         group.tax_id ?? '',
    group_npi:                      group.group_npi ?? '',
    taxonomy_code:                  group.taxonomy_code ?? '',
    medicaid_group_number:          group.medicaid_group_number ?? '',
    medicare_group_number:          group.medicare_group_number ?? '',
    practice_type:                  group.practice_type ?? '',
    authorized_official_name:       group.authorized_official_name ?? '',
    authorized_official_title:      group.authorized_official_title ?? '',
    authorized_official_phone:      group.authorized_official_phone ?? '',
    authorized_official_email:      group.authorized_official_email ?? '',
    credentialing_contact_name:     group.credentialing_contact_name ?? '',
    credentialing_contact_email:    group.credentialing_contact_email ?? '',
    credentialing_contact_phone:    group.credentialing_contact_phone ?? '',
    credentialing_contact_fax:      group.credentialing_contact_fax ?? '',
    billing_name:                   group.billing_name ?? '',
    billing_address_1:              group.billing_address_1 ?? '',
    billing_address_2:              group.billing_address_2 ?? '',
    billing_city:                   group.billing_city ?? '',
    billing_state:                  group.billing_state ?? '',
    billing_zip:                    group.billing_zip ?? '',
    billing_phone:                  group.billing_phone ?? '',
    billing_fax:                    group.billing_fax ?? '',
    notes:                          group.notes ?? '',
  })

  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Group name is required.')
      return
    }
    setSaving(true)
    setError(null)
    setJustSaved(false)

    const toNull = (v: string) => v.trim() || null

    const { error: saveError } = await supabase.from('groups').update({
      name:                           form.name,
      legal_name:                     toNull(form.legal_name),
      tax_id:                         toNull(form.tax_id),
      group_npi:                      toNull(form.group_npi),
      taxonomy_code:                  toNull(form.taxonomy_code),
      medicaid_group_number:          toNull(form.medicaid_group_number),
      medicare_group_number:          toNull(form.medicare_group_number),
      practice_type:                  toNull(form.practice_type),
      authorized_official_name:       toNull(form.authorized_official_name),
      authorized_official_title:      toNull(form.authorized_official_title),
      authorized_official_phone:      toNull(form.authorized_official_phone),
      authorized_official_email:      toNull(form.authorized_official_email),
      credentialing_contact_name:     toNull(form.credentialing_contact_name),
      credentialing_contact_email:    toNull(form.credentialing_contact_email),
      credentialing_contact_phone:    toNull(form.credentialing_contact_phone),
      credentialing_contact_fax:      toNull(form.credentialing_contact_fax),
      billing_name:                   toNull(form.billing_name),
      billing_address_1:              toNull(form.billing_address_1),
      billing_address_2:              toNull(form.billing_address_2),
      billing_city:                   toNull(form.billing_city),
      billing_state:                  toNull(form.billing_state),
      billing_zip:                    toNull(form.billing_zip),
      billing_phone:                  toNull(form.billing_phone),
      billing_fax:                    toNull(form.billing_fax),
      notes:                          toNull(form.notes),
      updated_at:                     new Date().toISOString(),
    }).eq('id', group.id)

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
      {/* ── Group Identity ───────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Group Identity</p>
        <div className="form-field">
          <label className="form-label">Group Name</label>
          <input className="form-input" value={form.name}
            onChange={(e) => set('name', e.target.value)} placeholder="Acme Medical Group" />
        </div>
        <div className="form-field">
          <label className="form-label">Legal Name</label>
          <input className="form-input" value={form.legal_name}
            onChange={(e) => set('legal_name', e.target.value)} placeholder="Acme Medical Group LLC" />
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Tax ID (EIN)</label>
            <input className="form-input" value={form.tax_id}
              onChange={(e) => set('tax_id', e.target.value)} placeholder="XX-XXXXXXX" />
          </div>
          <div className="form-field">
            <label className="form-label">Group NPI</label>
            <input className="form-input" value={form.group_npi}
              onChange={(e) => set('group_npi', e.target.value)} placeholder="10-digit NPI" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Taxonomy Code</label>
            <input className="form-input" value={form.taxonomy_code}
              onChange={(e) => set('taxonomy_code', e.target.value)} placeholder="10-digit NUCC code" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Practice Type</label>
            <select className="form-select" value={form.practice_type}
              onChange={(e) => set('practice_type', e.target.value)}>
              <option value="">Select</option>
              <option value="Solo">Solo</option>
              <option value="Group">Group</option>
              <option value="Hospital-Based">Hospital-Based</option>
              <option value="FQHC">FQHC</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Billing Numbers ──────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Billing Numbers</p>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Medicaid Group Number</label>
            <input className="form-input" value={form.medicaid_group_number}
              onChange={(e) => set('medicaid_group_number', e.target.value)} placeholder="State Medicaid group ID" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Medicare Group Number (PTAN)</label>
            <input className="form-input" value={form.medicare_group_number}
              onChange={(e) => set('medicare_group_number', e.target.value)} placeholder="Group PTAN" />
          </div>
        </div>
      </div>

      {/* ── Authorized Official ──────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Authorized Official</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.authorized_official_name}
              onChange={(e) => set('authorized_official_name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-field">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.authorized_official_title}
              onChange={(e) => set('authorized_official_title', e.target.value)} placeholder="e.g. CEO, Practice Administrator" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.authorized_official_phone}
              onChange={(e) => set('authorized_official_phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.authorized_official_email}
              onChange={(e) => set('authorized_official_email', e.target.value)} placeholder="official@group.com" />
          </div>
        </div>
      </div>

      {/* ── Credentialing Contact ────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Credentialing Contact</p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', marginTop: '-4px' }}>
          The person payers and credentialing bodies should contact. May differ from the authorized official.
        </p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.credentialing_contact_name}
              onChange={(e) => set('credentialing_contact_name', e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.credentialing_contact_email}
              onChange={(e) => set('credentialing_contact_email', e.target.value)} placeholder="credentialing@group.com" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.credentialing_contact_phone}
              onChange={(e) => set('credentialing_contact_phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Fax</label>
            <input className="form-input" type="tel" value={form.credentialing_contact_fax}
              onChange={(e) => set('credentialing_contact_fax', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
      </div>

      {/* ── Billing Address ──────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Billing Address</p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', marginTop: '-4px' }}>
          Leave blank if billing address is the same as the service location address.
        </p>
        <div className="form-field">
          <label className="form-label">Billing Entity Name</label>
          <input className="form-input" value={form.billing_name}
            onChange={(e) => set('billing_name', e.target.value)} placeholder="If different from group name" />
        </div>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Address Line 1</label>
            <input className="form-input" value={form.billing_address_1}
              onChange={(e) => set('billing_address_1', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="form-field">
            <label className="form-label">Address Line 2</label>
            <input className="form-input" value={form.billing_address_2}
              onChange={(e) => set('billing_address_2', e.target.value)} placeholder="Suite 100" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', gap: '10px' }}>
          <div className="form-field">
            <label className="form-label">City</label>
            <input className="form-input" value={form.billing_city}
              onChange={(e) => set('billing_city', e.target.value)} placeholder="City" />
          </div>
          <div className="form-field">
            <label className="form-label">State</label>
            <input className="form-input" value={form.billing_state}
              onChange={(e) => set('billing_state', e.target.value)} placeholder="TX" maxLength={2} />
          </div>
          <div className="form-field">
            <label className="form-label">ZIP</label>
            <input className="form-input" value={form.billing_zip}
              onChange={(e) => set('billing_zip', e.target.value)} placeholder="78701" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Billing Phone</label>
            <input className="form-input" type="tel" value={form.billing_phone}
              onChange={(e) => set('billing_phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Billing Fax</label>
            <input className="form-input" type="tel" value={form.billing_fax}
              onChange={(e) => set('billing_fax', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
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
