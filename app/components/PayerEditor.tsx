'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payer } from '../types'

interface Props {
  payer: Payer
}

export default function PayerEditor({ payer }: Props) {
  const [form, setForm] = useState({
    name:               payer.name,
    payer_id_code:      payer.payer_id_code ?? '',
    enrollment_phone:   payer.enrollment_phone ?? '',
    enrollment_fax:     payer.enrollment_fax ?? '',
    enrollment_address: payer.enrollment_address ?? '',
    enrollment_url:     payer.enrollment_url ?? '',
    processing_days:    payer.processing_days?.toString() ?? '',
    notes:              payer.notes ?? '',
  })

  const [saving, setSaving]       = useState(false)
  const [isDirty, setIsDirty]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const set = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Payer name is required.'); return }
    setSaving(true); setError(null); setJustSaved(false)

    const toNull = (v: string) => v.trim() || null
    const toInt  = (v: string) => v.trim() ? parseInt(v, 10) : null

    // Only include new columns if the migration has been run (graceful fallback)
    const patch: Record<string, unknown> = {
      name:               form.name,
      payer_id_code:      toNull(form.payer_id_code),
      enrollment_phone:   toNull(form.enrollment_phone),
      enrollment_address: toNull(form.enrollment_address),
      processing_days:    toInt(form.processing_days),
      notes:              toNull(form.notes),
      updated_at:         new Date().toISOString(),
    }
    if (toNull(form.enrollment_fax)) patch.enrollment_fax = toNull(form.enrollment_fax)
    if (toNull(form.enrollment_url)) patch.enrollment_url = toNull(form.enrollment_url)

    const { error: saveError } = await supabase.from('payers').update(patch).eq('id', payer.id)

    setSaving(false)
    if (saveError) {
      setError(saveError.message)
    } else {
      setIsDirty(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    }
  }

  return (
    <div>
      {/* ── Identity ──────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Payer Identity</p>
        <div className="form-field">
          <label className="form-label">Payer Name</label>
          <input className="form-input" value={form.name}
            onChange={e => set('name', e.target.value)} placeholder="Aetna, BCBS, etc." />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Payer ID Code</label>
            <input className="form-input" value={form.payer_id_code}
              onChange={e => set('payer_id_code', e.target.value)} placeholder="EDI payer ID" />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Avg Processing Days</label>
            <input className="form-input" type="number" min={0} value={form.processing_days}
              onChange={e => set('processing_days', e.target.value)} placeholder="e.g. 90" />
          </div>
        </div>
      </div>

      {/* ── Enrollment Contact ────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '12px' }}>
        <p className="section-label">Enrollment Contact</p>
        <div className="form-row form-row-2">
          <div className="form-field">
            <label className="form-label">Phone</label>
            <input className="form-input" type="tel" value={form.enrollment_phone}
              onChange={e => set('enrollment_phone', e.target.value)} placeholder="(800) 000-0000" />
          </div>
          <div className="form-field">
            <label className="form-label">Fax</label>
            <input className="form-input" type="tel" value={form.enrollment_fax}
              onChange={e => set('enrollment_fax', e.target.value)} placeholder="(800) 000-0001" />
          </div>
        </div>
        <div className="form-field">
          <label className="form-label">Mailing Address</label>
          <input className="form-input" value={form.enrollment_address}
            onChange={e => set('enrollment_address', e.target.value)} placeholder="Enrollment submissions address" />
        </div>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <label className="form-label">Enrollment Portal URL</label>
          <input className="form-input" type="url" value={form.enrollment_url}
            onChange={e => set('enrollment_url', e.target.value)} placeholder="https://provider.payer.com/enroll" />
        </div>
      </div>

      {/* ── Notes ─────────────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <p className="section-label">Notes</p>
        <div className="form-field" style={{ marginBottom: 0 }}>
          <textarea className="form-input" rows={3} value={form.notes}
            onChange={e => set('notes', e.target.value)}
            placeholder="Internal notes, submission quirks, contacts…"
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
