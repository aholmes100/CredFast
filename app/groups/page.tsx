import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { Group } from '../types'
import GroupList from '../components/GroupList'
import EmptyState from '../components/EmptyState'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: groups, error } = await supabase
    .from('groups')
    .select('*')
    .order('name')

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading groups.</div>
      </main>
    )
  }

  const list = (groups ?? []) as Group[]

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Groups</h1>
          <p className="page-subtitle">Provider organizations and billing entities</p>
        </div>
        <Link href="/groups/new" className="btn btn-primary">+ New Group</Link>
      </div>

      {list.length > 0 ? (
        <GroupList groups={list} />
      ) : (
        <EmptyState
          icon="🏥"
          headline="No groups yet"
          context="Groups represent the medical practices or organizations your providers are enrolled under."
          action={{ label: 'Add Group', href: '/groups/new' }}
        />
      )}
    </main>
  )
}
