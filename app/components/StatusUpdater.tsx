'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizationId } from '../lib/use-organization-id'
import type { ApplicationStatus } from '../types'

const PIPELINE: { value: ApplicationStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'ready',     label: 'Ready' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved' },
]

const STATUS_ORDER: Record<ApplicationStatus, number> = {
  draft: 0, ready: 1, submitted: 2, approved: 3,
}

interface Props {
  applicationId: string
  currentStatus: ApplicationStatus
  providerName?: string
  payerName?: string
}

export default function StatusUpdater({ applicationId, currentStatus, providerName, payerName }: Props) {
  const orgId = useOrganizationId()
  const [status, setStatus] = useState<ApplicationStatus>(currentStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const handleChange = async (next: ApplicationStatus) => {
    if (next === status || saving) return
    setSaving(true)
    setError(null)
    setJustSaved(false)

    const { error: updateError } = await supabase
      .from('enrollment_applications')
      .update({ status: next })
      .eq('id', applicationId)

    setSaving(false)
    if (updateError) {
      setError('Failed to update status.')
    } else {
      if (orgId) {
        await supabase.from('application_activity_log').insert({
          enrollment_application_id: applicationId,
          organization_id: orgId,
          event_type: 'status_change',
          old_value: status,
          new_value: next,
          summary: `Status changed from ${status} → ${next}`,
        })
        const subject = providerName ?? 'An application'
        const payer   = payerName   ? ` with ${payerName}` : ''
        await supabase.from('notifications').insert({
          organization_id: orgId,
          type:  'status_change',
          title: 'Application status updated',
          body:  `${subject}'s application${payer} moved to ${next}.`,
        })
      }
      setStatus(next)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
    }
  }

  const currentIndex = STATUS_ORDER[status]

  return (
    <div>
      {/* Current badge + feedback */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span className={`badge badge-${status}`}>{status}</span>
        {saving && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Saving…</span>}
        {justSaved && !saving && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
      </div>

      {/* Pipeline */}
      <div className="status-pipeline">
        {PIPELINE.map(({ value, label }, i) => {
          const isActive = value === status
          const isPast   = i < currentIndex

          let btnClass = 'pipeline-btn '
          if (isActive)     btnClass += 'pipeline-btn-active'
          else if (isPast)  btnClass += 'pipeline-btn-past'
          else              btnClass += 'pipeline-btn-future'

          return (
            <button
              key={value}
              onClick={() => handleChange(value)}
              disabled={saving}
              className={btnClass}
              style={{ cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1 }}
              title={`Set to ${label}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {error && (
        <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>⚠ {error}</p>
      )}
    </div>
  )
}
