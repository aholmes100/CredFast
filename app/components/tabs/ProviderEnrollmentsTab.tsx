'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import type { EnrollmentWithPayer } from '../../types'

interface Props {
  providerId: string
  orgId: string
  initialEnrollments: EnrollmentWithPayer[]
  allPayers: { id: string; name: string }[]
}

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  in_queue:   { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0',  label: 'In Queue' },
  in_progress:{ color: '#b45309', bg: '#fffbeb', border: '#fde68a',  label: 'In Progress' },
  enrolled:   { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',  label: 'Enrolled' },
  inactive:   { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0',  label: 'Inactive' },
}

const NEXT_ACTION_LABELS: Record<string, string> = {
  follow_up:        'Follow Up',
  submit:           'Submit',
  awaiting_approval:'Awaiting Approval',
  none:             '—',
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.in_queue
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`, borderRadius: '9999px', padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ProviderEnrollmentsTab({ providerId, orgId, initialEnrollments, allPayers }: Props) {
  const [enrollments, setEnrollments] = useState<EnrollmentWithPayer[]>(initialEnrollments)
  const [showAdd,     setShowAdd]     = useState(false)
  const [newPayerId,  setNewPayerId]  = useState('')
  const [adding,      setAdding]      = useState(false)
  const [addError,    setAddError]    = useState<string | null>(null)

  const enrolledPayerIds = new Set(enrollments.map(e => e.payer_id))
  const availablePayers  = allPayers.filter(p => !enrolledPayerIds.has(p.id))

  const handleAddPayer = async () => {
    if (!newPayerId) { setAddError('Select a payer.'); return }
    setAdding(true); setAddError(null)
    const { data, error } = await supabase
      .from('provider_payer_enrollments')
      .insert({
        provider_id:     providerId,
        payer_id:        newPayerId,
        status:          'in_queue',
        next_action:     'none',
        organization_id: orgId,
      })
      .select('*, payers(id, name)')
      .single()
    if (error || !data) { setAddError('Failed to add payer.'); setAdding(false); return }
    setEnrollments(prev => [data as unknown as EnrollmentWithPayer, ...prev])
    setShowAdd(false)
    setNewPayerId('')
    setAdding(false)
  }

  return (
    <div style={{ maxWidth: '960px' }}>
      <div className="card-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p className="section-label" style={{ margin: 0 }}>Payer Enrollments</p>
          {!showAdd && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setShowAdd(true); setAddError(null) }}
              style={{ cursor: 'pointer' }}
            >
              + Add Payer
            </button>
          )}
        </div>

        {/* Add payer form */}
        {showAdd && (
          <div className="add-form" style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Start a new enrollment</p>
            <div className="add-form-row">
              <div style={{ flex: 1, minWidth: '220px' }}>
                <label className="form-label">Payer</label>
                <select className="form-select" value={newPayerId} onChange={e => setNewPayerId(e.target.value)}>
                  <option value="">{availablePayers.length === 0 ? 'All payers already enrolled' : 'Select payer'}</option>
                  {availablePayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAddPayer}
                  disabled={adding || !newPayerId}
                  style={{ cursor: adding || !newPayerId ? 'not-allowed' : 'pointer' }}
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAdd(false); setAddError(null) }}
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
            {addError && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{addError}</p>}
          </div>
        )}

        {/* Enrollment list */}
        {enrollments.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
            No payer enrollments yet. Click &ldquo;Add Payer&rdquo; to start tracking an enrollment.
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 110px', gap: '12px', padding: '0 14px 8px', borderBottom: '1px solid #f1f5f9' }}>
              {['Payer', 'Status', 'Next Action', 'Follow-Up'].map(h => (
                <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{h}</span>
              ))}
            </div>

            <div className="row-list" style={{ border: 'none', borderRadius: 0 }}>
              {enrollments.map(e => (
                <Link
                  key={e.id}
                  href={`/providers/${providerId}/enrollments/${e.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div
                    className="row-list-item"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 110px', gap: '12px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                      {e.payers?.name ?? '—'}
                    </span>
                    <StatusBadge status={e.status} />
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      {NEXT_ACTION_LABELS[e.next_action] ?? '—'}
                    </span>
                    <span style={{ fontSize: '12px', color: e.next_follow_up_date ? '#0f172a' : '#94a3b8' }}>
                      {fmtDate(e.next_follow_up_date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
