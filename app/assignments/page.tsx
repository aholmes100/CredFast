import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { AssignmentWithRelations } from '../types'
import DeleteRowButton from '../components/DeleteRowButton'

export default async function AssignmentsPage() {
  const { data: assignments, error } = await supabase
    .from('provider_group_locations')
    .select(`
      *,
      providers(first_name, last_name),
      groups(name),
      locations(name)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading assignments.</div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Provider-to-group-location mappings</p>
        </div>
        <Link href="/assignments/new" className="btn btn-primary">+ New Assignment</Link>
      </div>

      {assignments?.length ? (
        <div className="card-list">
          {assignments.map((a: AssignmentWithRelations) => (
            <div key={a.id} className="card">
              <div className="card-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="card-title">
                      {a.providers?.first_name} {a.providers?.last_name}
                    </div>
                    {a.is_primary && (
                      <span className="badge" style={{ backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    <span className="card-meta-item">Group: <strong>{a.groups?.name || '—'}</strong></span>
                    <span className="card-meta-item">Location: <strong>{a.locations?.name || '—'}</strong></span>
                  </div>
                </div>
                <DeleteRowButton table="provider_group_locations" id={a.id} label="assignment" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No assignments yet. <Link href="/assignments/new">Add the first one.</Link>
        </div>
      )}
    </main>
  )
}
