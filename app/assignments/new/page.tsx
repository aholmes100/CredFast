'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import type { Provider, Group, Location } from '../../types'

export default function NewAssignmentPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<Provider[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [groupId, setGroupId] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('providers').select('*').order('last_name', { ascending: true }),
      supabase.from('groups').select('*').order('name', { ascending: true }),
    ]).then(([{ data: pData }, { data: gData }]) => {
      if (pData) setProviders(pData as Provider[])
      if (gData) setGroups(gData as Group[])
    })
  }, [])

  useEffect(() => {
    if (!groupId) { setLocations([]); return }
    supabase.from('locations').select('*')
      .eq('group_id', groupId).eq('is_active', true).order('name', { ascending: true })
      .then(({ data }) => { if (data) setLocations(data as Location[]) })
  }, [groupId])

  async function handleSubmit(formData: FormData) {
    const providerId = formData.get('provider_id') as string
    const locationId = formData.get('location_id') as string
    const isPrimary  = formData.get('is_primary') === 'on'

    const { error } = await supabase.from('provider_group_locations').insert([{
      provider_id: providerId, group_id: groupId, location_id: locationId, is_primary: isPrimary,
    }])

    if (error) { alert('Error creating assignment'); return }
    router.push('/assignments')
  }

  return (
    <main className="page">
      <Link href="/assignments" className="back-link">← Assignments</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Assignment</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Provider</label>
            <select className="form-select" name="provider_id">
              <option value="">Select Provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Group</label>
            <select className="form-select" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="form-label">Location</label>
            <select className="form-select" name="location_id" disabled={!groupId}
              style={{ opacity: !groupId ? 0.5 : 1 }}>
              <option value="">{groupId ? 'Select Location' : 'Select a group first'}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            fontSize: '13px', color: '#334155', marginBottom: '16px' }}>
            <input type="checkbox" name="is_primary" style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} />
            Primary location for this provider/group
          </label>
          <button type="submit" className="btn btn-primary btn-full">
            Create Assignment
          </button>
        </form>
      </div>
    </main>
  )
}
