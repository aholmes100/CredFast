'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface Task {
  id: string
  title: string
  task_type: string
  assigned_to: string | null
  due_date: string | null
  is_completed: boolean
  completed_at: string | null
  created_at: string
}

interface Note {
  id: string
  note: string
  is_pinned: boolean
  created_at: string
  created_by: string | null
}

interface FollowUp {
  id: string
  contact_method: string
  contact_name: string | null
  summary: string
  outcome: string | null
  follow_up_required: boolean
  follow_up_date: string | null
  logged_at: string
  logged_by: string | null
}

interface Props {
  applicationId: string
}

type Tab = 'tasks' | 'notes' | 'followup'

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function WorkflowPanel({ applicationId }: Props) {
  const [tab, setTab] = useState<Tab>('tasks')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)

  // Add-task form
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [newTaskAssigned, setNewTaskAssigned] = useState('')

  // Add-note form
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [noteBy, setNoteBy] = useState('')

  // Add-followup form
  const [showFollowupForm, setShowFollowupForm] = useState(false)
  const [fuMethod, setFuMethod] = useState('phone')
  const [fuContact, setFuContact] = useState('')
  const [fuSummary, setFuSummary] = useState('')
  const [fuOutcome, setFuOutcome] = useState('')
  const [fuBy, setFuBy] = useState('')
  const [fuNeedsFollowup, setFuNeedsFollowup] = useState(false)
  const [fuDate, setFuDate] = useState('')

  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [tasksRes, notesRes, followRes] = await Promise.all([
      supabase.from('application_tasks')
        .select('*')
        .eq('enrollment_application_id', applicationId)
        .order('is_completed')
        .order('sort_order'),
      supabase.from('internal_notes')
        .select('*')
        .eq('entity_type', 'application')
        .eq('entity_id', applicationId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('follow_up_log')
        .select('*')
        .eq('enrollment_application_id', applicationId)
        .order('logged_at', { ascending: false }),
    ])
    setTasks((tasksRes.data as Task[]) ?? [])
    setNotes((notesRes.data as Note[]) ?? [])
    setFollowUps((followRes.data as FollowUp[]) ?? [])
    setLoading(false)
  }, [applicationId])

  useEffect(() => { load() }, [load])

  // ── Toggle task complete ───────────────────────────────────────────
  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from('application_tasks')
      .update({ is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null })
      .eq('id', task.id)
    if (!error) load()
  }

  // ── Add task ──────────────────────────────────────────────────────
  const addTask = async () => {
    if (!newTaskTitle.trim()) return
    setSaving(true)
    const { error } = await supabase.from('application_tasks').insert({
      enrollment_application_id: applicationId,
      title: newTaskTitle.trim(),
      assigned_to: newTaskAssigned.trim() || null,
      due_date: newTaskDue || null,
      task_type: 'general',
      is_completed: false,
    })
    setSaving(false)
    if (!error) {
      setNewTaskTitle(''); setNewTaskDue(''); setNewTaskAssigned('')
      setShowTaskForm(false)
      load()
    }
  }

  // ── Add note ──────────────────────────────────────────────────────
  const addNote = async () => {
    if (!newNote.trim()) return
    setSaving(true)
    const { error } = await supabase.from('internal_notes').insert({
      entity_type: 'application',
      entity_id: applicationId,
      note: newNote.trim(),
      created_by: noteBy.trim() || null,
      is_pinned: false,
    })
    setSaving(false)
    if (!error) {
      setNewNote(''); setNoteBy('')
      setShowNoteForm(false)
      load()
    }
  }

  // ── Add follow-up ─────────────────────────────────────────────────
  const addFollowUp = async () => {
    if (!fuSummary.trim()) return
    setSaving(true)
    const { error } = await supabase.from('follow_up_log').insert({
      enrollment_application_id: applicationId,
      contact_method: fuMethod,
      contact_name: fuContact.trim() || null,
      summary: fuSummary.trim(),
      outcome: fuOutcome.trim() || null,
      follow_up_required: fuNeedsFollowup,
      follow_up_date: fuDate || null,
      logged_by: fuBy.trim() || null,
    })
    setSaving(false)
    if (!error) {
      setFuMethod('phone'); setFuContact(''); setFuSummary('')
      setFuOutcome(''); setFuBy(''); setFuNeedsFollowup(false); setFuDate('')
      setShowFollowupForm(false)
      load()
    }
  }

  const tasksDue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < new Date())
  const openTasks = tasks.filter(t => !t.is_completed)
  const fuPending = followUps.filter(f => f.follow_up_required && f.follow_up_date)

  const tabCounts: Record<Tab, number> = {
    tasks: openTasks.length,
    notes: notes.length,
    followup: fuPending.length,
  }

  return (
    <div>
      {/* Tab nav */}
      <div className="tab-nav">
        {([
          { id: 'tasks' as Tab,   label: 'Tasks' },
          { id: 'notes' as Tab,   label: 'Notes' },
          { id: 'followup' as Tab, label: 'Follow-up Log' },
        ] as const).map(({ id, label }) => (
          <button
            key={id}
            className={`tab-btn${tab === id ? ' tab-btn-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
            {tabCounts[id] > 0 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: '5px', width: '16px', height: '16px', borderRadius: '50%',
                fontSize: '10px', fontWeight: 700,
                backgroundColor: tab === id ? '#4f46e5' : '#e2e8f0',
                color: tab === id ? '#fff' : '#64748b',
              }}>{tabCounts[id]}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ fontSize: '13px', color: '#94a3b8', padding: '12px 0' }}>Loading…</p>
      ) : (
        <>
          {/* ── TASKS ─────────────────────────────────────────────── */}
          {tab === 'tasks' && (
            <div>
              {tasksDue.length > 0 && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#b91c1c' }}>
                  ⚠ {tasksDue.length} overdue task{tasksDue.length !== 1 ? 's' : ''}
                </div>
              )}

              {tasks.length === 0 && !showTaskForm ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>No tasks yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                  {tasks.map((task) => {
                    const isOverdue = !task.is_completed && task.due_date && new Date(task.due_date) < new Date()
                    return (
                      <div key={task.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                        padding: '8px 10px', borderRadius: '6px',
                        backgroundColor: task.is_completed ? '#f8fafc' : '#fff',
                        border: `1px solid ${isOverdue ? '#fecaca' : '#f1f5f9'}`,
                      }}>
                        <button
                          onClick={() => toggleTask(task)}
                          style={{
                            width: '16px', height: '16px', borderRadius: '4px', border: '1.5px solid',
                            borderColor: task.is_completed ? '#22c55e' : '#cbd5e1',
                            backgroundColor: task.is_completed ? '#22c55e' : 'transparent',
                            cursor: 'pointer', flexShrink: 0, marginTop: '1px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {task.is_completed && <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>✓</span>}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '13px', fontWeight: 500,
                            color: task.is_completed ? '#94a3b8' : '#0f172a',
                            textDecoration: task.is_completed ? 'line-through' : 'none',
                          }}>
                            {task.title}
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {task.due_date && (
                              <span style={{ fontSize: '11px', color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 600 : 400 }}>
                                {isOverdue ? '⚠ ' : ''}Due {fmtDate(task.due_date)}
                              </span>
                            )}
                            {task.assigned_to && (
                              <span style={{ fontSize: '11px', color: '#64748b' }}>→ {task.assigned_to}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {showTaskForm ? (
                <div className="add-form">
                  <div style={{ marginBottom: '8px' }}>
                    <input
                      className="form-input"
                      placeholder="Task title…"
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      style={{ marginBottom: '6px' }}
                      onKeyDown={e => e.key === 'Enter' && addTask()}
                      autoFocus
                    />
                  </div>
                  <div className="add-form-row">
                    <input
                      className="form-input"
                      type="date"
                      value={newTaskDue}
                      onChange={e => setNewTaskDue(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      className="form-input"
                      placeholder="Assigned to (email)…"
                      value={newTaskAssigned}
                      onChange={e => setNewTaskAssigned(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button onClick={addTask} disabled={saving || !newTaskTitle.trim()} className="btn btn-primary btn-sm">
                      {saving ? 'Saving…' : 'Add'}
                    </button>
                    <button onClick={() => setShowTaskForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowTaskForm(true)} className="btn btn-secondary btn-sm">
                  + Add Task
                </button>
              )}
            </div>
          )}

          {/* ── NOTES ─────────────────────────────────────────────── */}
          {tab === 'notes' && (
            <div>
              {notes.length === 0 && !showNoteForm ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>No notes yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  {notes.map((note) => (
                    <div key={note.id} style={{
                      padding: '10px 12px',
                      backgroundColor: note.is_pinned ? '#fffbeb' : '#f8fafc',
                      border: `1px solid ${note.is_pinned ? '#fde68a' : '#e2e8f0'}`,
                      borderRadius: '8px',
                    }}>
                      {note.is_pinned && <span style={{ fontSize: '10px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📌 Pinned · </span>}
                      <span style={{ fontSize: '13px', color: '#0f172a', whiteSpace: 'pre-wrap' }}>{note.note}</span>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                        {fmtTime(note.created_at)}{note.created_by ? ` · ${note.created_by}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showNoteForm ? (
                <div className="add-form">
                  <textarea
                    className="form-input"
                    placeholder="Add a note…"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    rows={3}
                    style={{ resize: 'vertical', marginBottom: '8px' }}
                    autoFocus
                  />
                  <div className="add-form-row">
                    <input
                      className="form-input"
                      placeholder="Your name / email (optional)…"
                      value={noteBy}
                      onChange={e => setNoteBy(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button onClick={addNote} disabled={saving || !newNote.trim()} className="btn btn-primary btn-sm">
                      {saving ? 'Saving…' : 'Save Note'}
                    </button>
                    <button onClick={() => setShowNoteForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNoteForm(true)} className="btn btn-secondary btn-sm">
                  + Add Note
                </button>
              )}
            </div>
          )}

          {/* ── FOLLOW-UP LOG ─────────────────────────────────────── */}
          {tab === 'followup' && (
            <div>
              {fuPending.length > 0 && (
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#92400e' }}>
                  ⏰ {fuPending.length} follow-up{fuPending.length !== 1 ? 's' : ''} pending
                </div>
              )}

              {followUps.length === 0 && !showFollowupForm ? (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '8px 0' }}>No follow-up entries yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                  {followUps.map((fu) => (
                    <div key={fu.id} style={{
                      padding: '10px 12px',
                      backgroundColor: '#f8fafc',
                      border: `1px solid ${fu.follow_up_required ? '#fde68a' : '#e2e8f0'}`,
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                          letterSpacing: '0.06em', color: '#475569',
                          backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px',
                        }}>
                          {fu.contact_method}
                        </span>
                        {fu.contact_name && <span style={{ fontSize: '11px', color: '#64748b' }}>{fu.contact_name}</span>}
                        {fu.follow_up_required && fu.follow_up_date && (
                          <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 500 }}>
                            ⏰ Follow up {fmtDate(fu.follow_up_date)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '13px', color: '#0f172a' }}>{fu.summary}</div>
                      {fu.outcome && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Outcome: {fu.outcome}</div>
                      )}
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>
                        {fmtTime(fu.logged_at)}{fu.logged_by ? ` · ${fu.logged_by}` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showFollowupForm ? (
                <div className="add-form">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <select className="form-select" value={fuMethod} onChange={e => setFuMethod(e.target.value)}>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="fax">Fax</option>
                      <option value="portal">Portal</option>
                      <option value="mail">Mail</option>
                    </select>
                    <input
                      className="form-input"
                      placeholder="Contact name…"
                      value={fuContact}
                      onChange={e => setFuContact(e.target.value)}
                    />
                  </div>
                  <textarea
                    className="form-input"
                    placeholder="Summary of contact…"
                    value={fuSummary}
                    onChange={e => setFuSummary(e.target.value)}
                    rows={2}
                    style={{ resize: 'vertical', marginBottom: '8px' }}
                    autoFocus
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input
                      className="form-input"
                      placeholder="Outcome (optional)…"
                      value={fuOutcome}
                      onChange={e => setFuOutcome(e.target.value)}
                    />
                    <input
                      className="form-input"
                      placeholder="Logged by (email)…"
                      value={fuBy}
                      onChange={e => setFuBy(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', cursor: 'pointer' }}>
                      <input type="checkbox" checked={fuNeedsFollowup} onChange={e => setFuNeedsFollowup(e.target.checked)} />
                      Follow-up required
                    </label>
                    {fuNeedsFollowup && (
                      <input type="date" className="form-input" value={fuDate} onChange={e => setFuDate(e.target.value)} style={{ width: 'auto' }} />
                    )}
                  </div>
                  <div className="add-form-row">
                    <button onClick={addFollowUp} disabled={saving || !fuSummary.trim()} className="btn btn-primary btn-sm">
                      {saving ? 'Saving…' : 'Log Entry'}
                    </button>
                    <button onClick={() => setShowFollowupForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowFollowupForm(true)} className="btn btn-secondary btn-sm">
                  + Log Follow-up
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
