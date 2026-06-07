'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { EnrollmentActivityLog, TeamMember, EnrollmentStatus, EnrollmentNextAction } from '../types'

type PayerDetail = {
  id: string
  name: string
  enrollment_phone: string | null
  enrollment_url: string | null
  enrollment_fax: string | null
}

type EnrollmentRow = {
  id: string
  provider_id: string
  payer_id: string
  status: string
  next_action: string
  assigned_to: string | null
  next_follow_up_date: string | null
  submitted_at: string | null
  approved_at: string | null
  effective_date: string | null
  organization_id: string | null
  payers: PayerDetail | null
}

type AppRow = {
  id: string
  status: string
  created_at: string
  submitted_at: string | null
  groups: { name: string } | null
}

interface Props {
  enrollment:   EnrollmentRow
  applications: AppRow[]
  activityLog:  EnrollmentActivityLog[]
  teamMembers:  TeamMember[]
  providerId:   string
  providerName: string
  orgId:        string
  userId:       string
}

const STATUS_OPTIONS: { value: EnrollmentStatus; label: string }[] = [
  { value: 'in_queue',    label: 'In Queue' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'enrolled',    label: 'Enrolled' },
  { value: 'inactive',    label: 'Inactive' },
]

const NEXT_ACTION_OPTIONS: { value: EnrollmentNextAction; label: string }[] = [
  { value: 'none',              label: '— None' },
  { value: 'submit',            label: 'Submit' },
  { value: 'follow_up',         label: 'Follow Up' },
  { value: 'awaiting_approval', label: 'Awaiting Approval' },
]

const STATUS_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  in_queue:    { color: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' },
  in_progress: { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  enrolled:    { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  inactive:    { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
}

const APP_STATUS_COLORS: Record<string, string> = {
  draft:     '#64748b',
  ready:     '#1d4ed8',
  submitted: '#b45309',
  approved:  '#15803d',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return ''
  return d.includes('T') ? d.split('T')[0] : d
}

export default function EnrollmentDetailView({
  enrollment,
  applications,
  activityLog: initialLog,
  teamMembers,
  providerId,
  providerName,
  orgId,
  userId,
}: Props) {
  const payer = enrollment.payers

  // Editable enrollment fields
  const [status,             setStatus]             = useState(enrollment.status)
  const [nextAction,         setNextAction]         = useState(enrollment.next_action)
  const [assignedTo,         setAssignedTo]         = useState(enrollment.assigned_to ?? '')
  const [nextFollowUpDate,   setNextFollowUpDate]   = useState(toDateInput(enrollment.next_follow_up_date))
  const [submittedAt,        setSubmittedAt]        = useState(toDateInput(enrollment.submitted_at))
  const [approvedAt,         setApprovedAt]         = useState(toDateInput(enrollment.approved_at))
  const [effectiveDate,      setEffectiveDate]      = useState(toDateInput(enrollment.effective_date))

  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDirty,   setIsDirty]   = useState(false)

  // Activity log
  const [log,        setLog]        = useState<EnrollmentActivityLog[]>(initialLog)
  const [newNote,    setNewNote]    = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [noteError,  setNoteError]  = useState<string | null>(null)

  const markDirty = () => setIsDirty(true)

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setSaved(false)
    const { error } = await supabase
      .from('provider_payer_enrollments')
      .update({
        status,
        next_action:         nextAction,
        assigned_to:         assignedTo || null,
        next_follow_up_date: nextFollowUpDate || null,
        submitted_at:        submittedAt || null,
        approved_at:         approvedAt || null,
        effective_date:      effectiveDate || null,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', enrollment.id)
    setSaving(false)
    if (error) { setSaveError('Failed to save.'); return }
    setIsDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true); setNoteError(null)
    const { data, error } = await supabase
      .from('enrollment_activity_log')
      .insert({
        enrollment_id:   enrollment.id,
        organization_id: orgId,
        author_id:       userId || null,
        note:            newNote.trim(),
      })
      .select('id, enrollment_id, organization_id, author_id, note, created_at')
      .single()
    setAddingNote(false)
    if (error || !data) { setNoteError('Failed to add note.'); return }
    setLog(prev => [data as EnrollmentActivityLog, ...prev])
    setNewNote('')
  }

  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.in_queue
  const authorName  = (authorId: string | null) => {
    if (!authorId) return 'Unknown'
    const m = teamMembers.find(t => t.id === authorId)
    return m?.display_name ?? `User ${authorId.slice(0, 8)}`
  }

  return (
    <main className="page-xl">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/providers" className="breadcrumb-link">Providers</Link>
        <span className="breadcrumb-sep">/</span>
        <Link href={`/providers/${providerId}?tab=enrollments`} className="breadcrumb-link">{providerName}</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{payer?.name ?? 'Enrollment'}</span>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">{payer?.name ?? 'Enrollment'}</h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: statusStyle.color, backgroundColor: statusStyle.bg, border: `1px solid ${statusStyle.border}`, borderRadius: '9999px', padding: '2px 10px' }}>
              {STATUS_OPTIONS.find(s => s.value === status)?.label ?? status}
            </span>
            {payer?.enrollment_phone && <span className="pill">{payer.enrollment_phone}</span>}
            {payer?.enrollment_url && (
              <a href={payer.enrollment_url} target="_blank" rel="noreferrer" className="pill" style={{ color: '#4f46e5', textDecoration: 'none' }}>
                Portal ↗
              </a>
            )}
          </div>
        </div>
        <Link href={`/providers/${providerId}?tab=enrollments`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
          ← Back
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px', alignItems: 'start', maxWidth: '1060px' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Enrollment fields */}
          <div className="card-lg">
            <p className="section-label">Enrollment Status</p>
            <div className="form-row form-row-2" style={{ marginBottom: '12px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={e => { setStatus(e.target.value); markDirty() }}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Next Action</label>
                <select className="form-select" value={nextAction} onChange={e => { setNextAction(e.target.value); markDirty() }}>
                  {NEXT_ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row form-row-2" style={{ marginBottom: '12px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Assigned To</label>
                <select className="form-select" value={assignedTo} onChange={e => { setAssignedTo(e.target.value); markDirty() }}>
                  <option value="">— Unassigned</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.display_name ?? `User ${m.id.slice(0, 8)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Next Follow-Up</label>
                <input className="form-input" type="date" value={nextFollowUpDate} onChange={e => { setNextFollowUpDate(e.target.value); markDirty() }} />
              </div>
            </div>
            <div className="form-row form-row-3" style={{ marginBottom: '16px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Submitted</label>
                <input className="form-input" type="date" value={submittedAt} onChange={e => { setSubmittedAt(e.target.value); markDirty() }} />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Approved</label>
                <input className="form-input" type="date" value={approvedAt} onChange={e => { setApprovedAt(e.target.value); markDirty() }} />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Effective Date</label>
                <input className="form-input" type="date" value={effectiveDate} onChange={e => { setEffectiveDate(e.target.value); markDirty() }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={handleSave}
                disabled={saving || !isDirty}
                className={isDirty && !saving ? 'btn btn-primary btn-sm' : 'btn btn-disabled btn-sm'}
                style={{ cursor: isDirty && !saving ? 'pointer' : 'not-allowed' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved     && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
              {saveError && <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {saveError}</span>}
              {isDirty && !saving && !saved && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Unsaved changes</span>}
            </div>
          </div>

          {/* Applications */}
          <div className="card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p className="section-label" style={{ margin: 0 }}>Applications</p>
              <Link
                href={`/applications/new?provider_id=${providerId}&payer_id=${enrollment.payer_id}`}
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: 'none' }}
              >
                + Generate Application
              </Link>
            </div>
            {applications.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px 0' }}>
                No applications yet. Click &ldquo;Generate Application&rdquo; to create one.
              </div>
            ) : (
              <div className="row-list">
                {applications.map(app => (
                  <Link
                    key={app.id}
                    href={`/applications/${app.id}`}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                  >
                    <div className="row-list-item" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>
                          {app.groups?.name ?? '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                          Created {fmtDate(app.created_at)}
                          {app.submitted_at && ` · Submitted ${fmtDate(app.submitted_at)}`}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '9999px', color: APP_STATUS_COLORS[app.status] ?? '#64748b', backgroundColor: '#f8fafc', textTransform: 'capitalize', flexShrink: 0 }}>
                        {app.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column — Activity log */}
        <div className="card-lg" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <p className="section-label">Activity Log</p>

          {/* Add note */}
          <div style={{ marginBottom: '16px' }}>
            <textarea
              className="form-input"
              rows={3}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note…"
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5', marginBottom: '8px' }}
            />
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className={newNote.trim() && !addingNote ? 'btn btn-primary btn-sm' : 'btn btn-disabled btn-sm'}
                style={{ cursor: newNote.trim() && !addingNote ? 'pointer' : 'not-allowed' }}
              >
                {addingNote ? 'Adding…' : 'Add Note'}
              </button>
              {noteError && <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {noteError}</span>}
            </div>
          </div>

          {/* Log entries */}
          {log.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '12px 0', textAlign: 'center' }}>
              No notes yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {log.map(entry => (
                <div key={entry.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                      {authorName(entry.author_id)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {fmtDateTime(entry.created_at)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', margin: 0 }}>
                    {entry.note}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
