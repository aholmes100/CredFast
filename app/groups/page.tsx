import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { Group } from '../types'
import GroupList from '../components/GroupList'

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

      <GroupList groups={list} />
    </main>
  )
}
