import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import type { Group } from '../../types'
import GroupEditor from '../../components/GroupEditor'
import DeleteButton from '../../components/DeleteButton'

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const group = data as Group

  return (
    <main className="page-wide">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/groups" className="breadcrumb-link">Groups</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{group.name}</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{group.name}</h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {group.tax_id && (
              <span className="pill">EIN: {group.tax_id}</span>
            )}
            {group.group_npi && (
              <span className="pill">Group NPI: {group.group_npi}</span>
            )}
            {group.practice_type && (
              <span className="pill">{group.practice_type}</span>
            )}
          </div>
        </div>
        <DeleteButton table="groups" id={group.id} label="Delete Group" redirectTo="/groups" />
      </div>

      {/* Editable group form */}
      <GroupEditor group={group} />
    </main>
  )
}
