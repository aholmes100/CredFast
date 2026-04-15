'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Location, Group } from '../types'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]

interface Props {
  location: Location
}

export default function LocationDetailEditor({ location }: Props) {
  const [groups, setGroups] = useState<Pick<Group, 'id' | 'name'>[]>([])

  const [form, setForm] = useState({
    name:               location.name,
    group_id:           location.group_id ?? '',
    address_1:          location.address_1 ?? '',
    address_2:          location.address_2 ?? '',
    city:               location.city ?? '',
    state:              location.state ?? '',
    zip:                location.zip ?? '',
    county:             location.county ?? '',
    phone:              location.phone ?? '',
    fax:                location.fax ?? '',
    facility_type:      location.facility_type ?? '',
    hours_mon_fri:      location.hours_mon_fri ?? '',
    hours_weekend:      location.hours_weekend ?? '',
    // Mailing address
    mailing_address_1:  location.mailing_address_1 ?? '',
    mailing_address_2:  location.mailing_address_2 ?? '',
    mailing_city:       location.mailing_city ?? '',
    mailing_state:      location.mailing_state ?? '',
    mailing_zip:        location.mailing_zip ?? '',
    // Booleans
    accepts_new_patients: location.accepts_new_patients ?? true,
    handicap_accessible:  location.handicap_accessible ?? false,
    accepts_medicaid:     location.accepts_medicaid ?? false,
    accepts_medicare:     location.accepts_medicare ?? false,
    is_active:            location.is_active ?? true,
    notes:                location.notes ?? '',
  })

  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    supabase.from('groups').select('id, name').order('name').then(({ data }) => {
      if (data) setGroups(data as Pick<Group, 'id' | 'name'>[])
    })
  }, [])

  const set = (field: keyof typeof form, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Location name is required.'); return }
    setSaving(true); setError(null); setJustSaved(false)

    const toNull = (v: string) => v.trim() || null

    const { error: saveError } = await supabase.from('locations').update({
      name:               form.name,
      group_id:           toNull(form.group_id),
      address_1:          toNull(form.address_1),
      address_2:          toNull(form.address_2),
      city:               toNull(form.city),
      state:              toNull(form.state),
      zip:                toNull(form.zip),
      county:             toNull(form.county),
      phone:              toNull(form.phone),
      fax:                toNull(form.fax),
      facility_type:      toNull(form.facility_type),
      hours_mon_fri:      toNull(form.hours_mon_fri),
      hours_weekend:      toNull(form.hours_weekend),
      mailing_address_1:  toNull(form.mailing_address_1),
      mailing_address_2:  toNull(form.mailing_address_2),
      mailing_city:       toNull(form.mailing_city),
      mailing_state:      toNull(form.mailing_state),
      mailing_zip:        toNull(form.mailing_zip),
      accepts_new_patients: form.accepts_new_patients,
      handicap_accessible:  form.handicap_accessible,
      accepts_medicaid:     form.accepts_medicaid,
      accepts_medicare:     form.accepts_medicare,
      is_active:            form.is_active,
      notes:              toNull(form.notes),
      updated_at:         new Date().toISOString(),
    }).eq('id', location.id)

    setSaving(false)
    if (saveError) {
      setError('Failed to save changes. Please try again.')
    } else {
      setIsDirty(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    }
  }

  const CheckField = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={form[field] as boolean}
        onChange={e => set(field, e.target.checked)}
        style={{ accentColor: '#4f46e5', width: '16px', height: '16px' }}
      />
      <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{label}</span>
    </label>
  )

  return (
    <div>
      {/* ── Identity ──────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Location Identity</p>
        <div className="form-field">
          <label className="form-label">Location Name</label>
          <input className="form-input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Main Office" />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Group</label>
            <select className="form-select" value={form.group_id}
              onChange={e => set('group_id', e.target.value)}>
              <option value="">No group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Facility Type</label>
            <select className="form-select" value={form.facility_type}
              onChange={e => set('facility_type', e.target.value)}>
              <option value="">Select</option>
              <option value="Office">Office</option>
              <option value="Clinic">Clinic</option>
              <option value="Hospital">Hospital</option>
              <option value="Urgent Care">Urgent Care</option>
              <option value="Telehealth">Telehealth</option>
              <option value="Lab">Lab</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Service Address ───────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Service Address</p>
        <div className="form-field">
          <label className="form-label">Address Line 1</label>
          <input className="form-input" value={form.address_1}
            onChange={e => set('address_1', e.target.value)} placeholder="123 Main St" />
        </div>
        <div className="form-field">
          <label className="form-label">Address Line 2</label>
          <input className="form-input" value={form.address_2}
            onChange={e => set('address_2', e.target.value)} placeholder="Suite 100" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', gap: '10px' }}>
          <div className="form-field">
            <label className="form-label">City</label>
            <input className="form-input" value={form.city}
              onChange={e => set('city', e.target.value)} placeholder="City" />
          </div>
          <div className="form-field">
            <label className="form-label">State</label>
            <select className="form-select" value={form.state}
              onChange={e => set('state', e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">ZIP</label>
            <input className="form-input" value={form.zip}
              onChange={e => set('zip', e.target.value)} placeholder="78701" />
          </div>
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">County</label>
            <input className="form-input" value={form.county}
              onChange={e => set('county', e.target.value)} placeholder="Travis" />
          </div>
          <div />
        </div>
      </div>

      {/* ── Mailing Address ───────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Mailing Address</p>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px', marginTop: '-4px' }}>
          Leave blank if same as service address.
        </p>
        <div className="form-field">
          <label className="form-label">Address Line 1</label>
          <input className="form-input" value={form.mailing_address_1}
            onChange={e => set('mailing_address_1', e.target.value)} placeholder="PO Box or street" />
        </div>
        <div className="form-field">
          <label className="form-label">Address Line 2</label>
          <input className="form-input" value={form.mailing_address_2}
            onChange={e => set('mailing_address_2', e.target.value)} placeholder="Suite, floor, etc." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', gap: '10px', marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">City</label>
            <input className="form-input" value={form.mailing_city}
              onChange={e => set('mailing_city', e.target.value)} placeholder="City" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">State</label>
            <select className="form-select" value={form.mailing_state}
              onChange={e => set('mailing_state', e.target.value)}>
              <option value="">—</option>
              {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">ZIP</label>
            <input className="form-input" value={form.mailing_zip}
              onChange={e => set('mailing_zip', e.target.value)} placeholder="78701" />
          </div>
        </div>
      </div>

      {/* ── Contact ───────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Contact</p>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.phone}
              onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Fax</label>
            <input className="form-input" type="tel" value={form.fax}
              onChange={e => set('fax', e.target.value)} placeholder="(555) 000-0000" />
          </div>
        </div>
      </div>

      {/* ── Hours ─────────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Hours</p>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Mon – Fri</label>
            <input className="form-input" value={form.hours_mon_fri}
              onChange={e => set('hours_mon_fri', e.target.value)} placeholder="8am – 5pm" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Weekends</label>
            <input className="form-input" value={form.hours_weekend}
              onChange={e => set('hours_weekend', e.target.value)} placeholder="Closed" />
          </div>
        </div>
      </div>

      {/* ── Capabilities ──────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Capabilities</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <CheckField field="accepts_new_patients" label="Accepting New Patients" />
          <CheckField field="accepts_medicaid"     label="Accepts Medicaid" />
          <CheckField field="accepts_medicare"     label="Accepts Medicare" />
          <CheckField field="handicap_accessible"  label="Handicap Accessible" />
          <CheckField field="is_active"            label="Location Active" />
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <p className="section-label">Notes</p>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <textarea className="form-input" rows={3} value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Internal notes…"
            style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
        </div>
      </div>

      {/* ── Save Bar ──────────────────────────────────────── */}
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
