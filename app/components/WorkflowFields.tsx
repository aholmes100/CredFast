'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizationId } from '../lib/use-organization-id'

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  { value: 'normal', label: 'Normal', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
  { value: 'high',   label: 'High',   color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  { value: 'urgent', label: 'Urgent', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
]

interface Props {
  applicationId: string
  initialPriority: string
  initialNextAction: string | null
  initialAssignedTo: string | null
  initialFollowUpDate: string | null
}

export default function WorkflowFields({
  applicationId,
  initialPriority,
  initialNextAction,
  initialAssignedTo,
  initialFollowUpDate,
}: Props) {
  const orgId = useOrganizationId()
  const [priority, setPriority]       = useState(initialPriority || 'normal')
  const [nextAction, setNextAction]   = useState(initialNextAction ?? '')
  const [assignedTo, setAssignedTo]   = useState(initialAssignedTo ?? '')
  const [followUpDate, setFollowUpDate] = useState(
    initialFollowUpDate ? initialFollowUpDate.slice(0, 10) : ''
  )
  const [saving, setSaving]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('enrollment_applications')
      .update({
        priority,
        next_action:    nextAction.trim() || null,
        assigned_to:    assignedTo.trim() || null,
        follow_up_date: followUpDate || null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (updateError) {
      setError('Failed to save.')
      setSaving(false)
      return
    }

    if (orgId) {
      await supabase.from('application_activity_log').insert({
        enrollment_application_id: applicationId,
        organization_id: orgId,
        event_type: 'field_update',
        summary: `Workflow fields updated — Priority: ${priority}${nextAction.trim() ? `, Next action: ${nextAction.trim()}` : ''}${assignedTo.trim() ? `, Assigned to: ${assignedTo.trim()}` : ''}`,
      })
    }

    setSaving(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* Priority */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
          Priority
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {PRIORITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              style={{
                flex: 1,
                padding: '5px 0',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                border: `1.5px solid ${priority === p.value ? p.border : '#e2e8f0'}`,
                backgroundColor: priority === p.value ? p.bg : '#fff',
                color: priority === p.value ? p.color : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Next Action */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Next Action
        </label>
        <input
          className="form-input"
          value={nextAction}
          onChange={e => setNextAction(e.target.value)}
          placeholder="e.g. Follow up with payer on status…"
          onKeyDown={e => e.key === 'Enter' && save()}
        />
      </div>

      {/* Assigned To */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Assigned To
        </label>
        <input
          className="form-input"
          value={assignedTo}
          onChange={e => setAssignedTo(e.target.value)}
          placeholder="name or email…"
        />
      </div>

      {/* Follow-up Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Follow-up Date
        </label>
        <input
          className="form-input"
          type="date"
          value={followUpDate}
          onChange={e => setFollowUpDate(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={save}
          disabled={saving}
          className="btn btn-primary btn-sm"
          style={{ width: '100%' }}
        >
          {saving ? 'Saving…' : 'Save Workflow'}
        </button>
      </div>
      {justSaved && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
      {error && <span style={{ fontSize: '12px', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
