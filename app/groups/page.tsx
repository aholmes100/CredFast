import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { Group } from '../types'

export default async function GroupsPage() {
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading groups.</div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Provider organizations and billing entities</p>
        </div>
        <Link href="/groups/new" className="btn btn-primary">+ New Group</Link>
      </div>

      {groups?.length ? (
        <div className="card-list">
          {groups.map((group: Group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="card-hover">
              <div className="card-row">
                <div>
                  <div className="card-title">{group.name}</div>
                  {group.legal_name && group.legal_name !== group.name && (
                    <div className="card-sub">{group.legal_name}</div>
                  )}
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    <span className="card-meta-item">Tax ID: <strong>{group.tax_id || '—'}</strong></span>
                    <span className="card-meta-item">Group NPI: <strong>{group.group_npi || '—'}</strong></span>
                    {group.practice_type && <span className="card-meta-item">{group.practice_type}</span>}
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', fontSize: '18px' }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No groups yet. <Link href="/groups/new">Add the first one.</Link>
        </div>
      )}
    </main>
  )
}
