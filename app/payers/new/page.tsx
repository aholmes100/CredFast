'use client'

import Link from 'next/link'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewPayerPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    name:               '',
    payer_id_code:      '',
    enrollment_phone:   '',
    enrollment_fax:     '',
    enrollment_address: '',
    enrollment_url:     '',
    processing_days:    '',
    notes:              '',
  })

  const set = (field: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Payer name is required.'); return }
    setSaving(true); setError(null)

    const toNull = (v: string) => v.trim() || null
    const toInt  = (v: string) => v.trim() ? parseInt(v, 10) : null

    // Build the insert row — only include new columns if they have values,
    // so this works whether or not the sagamore migration has been run.
    const row: Record<string, unknown> = {
      name:               form.name,
      payer_id_code:      toNull(form.payer_id_code),
      enrollment_phone:   toNull(form.enrollment_phone),
      enrollment_address: toNull(form.enrollment_address),
      processing_days:    toInt(form.processing_days),
      notes:              toNull(form.notes),
    }
    if (toNull(form.enrollment_fax)) row.enrollment_fax = toNull(form.enrollment_fax)
    if (toNull(form.enrollment_url)) row.enrollment_url = toNull(form.enrollment_url)

    const { data, error: insertError } = await supabase
      .from('payers').insert([row]).select('id').single()

    setSaving(false)
    if (insertError || !data) {
      setError(insertError?.message ?? 'Failed to create payer. Please try again.')
      return
    }
    router.push(`/payers/${data.id}`)
  }

  return (
    <main className="page">
      <Link href="/payers" className="back-link">← Payers</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Payer</h1>

      <form onSubmit={handleSubmit}>
        {/* ── Identity ────────────────────────────────────── */}
        <div className="card-lg" style={{ marginBottom: '12px' }}>
          <p className="section-label">Payer Identity</p>
          <div className="form-field">
            <label className="form-label">Payer Name <span style={{ color: '#dc2626' }}>*</span></label>
            <input className="form-input" value={form.name}
              onChange={e => set('name', e.target.value)} placeholder="Aetna, BCBS Texas, etc." autoFocus />
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

        {/* ── Enrollment Contact ──────────────────────────── */}
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

        {/* ── Notes ───────────────────────────────────────── */}
        <div className="card-lg" style={{ marginBottom: '20px' }}>
          <p className="section-label">Notes</p>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <textarea className="form-input" rows={3} value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Submission quirks, contacts, requirements…"
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }} />
          </div>
        </div>

        {error && (
          <div className="alert-error" style={{ marginBottom: '12px' }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={saving}
            className={saving ? 'btn btn-disabled' : 'btn btn-primary'}
            style={{ cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Payer'}
          </button>
          <Link href="/payers" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </main>
  )
}
