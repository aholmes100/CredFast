'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import type { Provider, Group, Payer, Location, LocationMode } from '../../types'

export default function NewApplicationPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<Provider[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [payers, setPayers] = useState<Payer[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [providerId, setProviderId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [locationMode, setLocationMode] = useState<LocationMode>('all')
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('providers').select('*').order('last_name', { ascending: true }),
      supabase.from('groups').select('*').order('name', { ascending: true }),
      supabase.from('payers').select('*').order('name', { ascending: true }),
    ]).then(([{ data: pData }, { data: gData }, { data: pyData }]) => {
      if (pData) setProviders(pData as Provider[])
      if (gData) setGroups(gData as Group[])
      if (pyData) setPayers(pyData as Payer[])
    })
  }, [])

  useEffect(() => {
    if (!providerId || !groupId) { setLocations([]); setSelectedLocationIds([]); return }
    supabase.from('provider_group_locations')
      .select(`location_id, locations(id, name)`)
      .eq('provider_id', providerId).eq('group_id', groupId).eq('is_active', true)
      .then(({ data, error }) => {
        if (!error && data) {
          const mapped = data
            .map((row) => (row as unknown as { locations: Location | null }).locations)
            .filter((loc): loc is Location => loc !== null)
          setLocations(mapped)
          setSelectedLocationIds([])
        }
      })
  }, [providerId, groupId])

  const toggleLocation = (id: string) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(formData: FormData) {
    const payerId = formData.get('payer_id') as string
    if (!providerId || !groupId || !payerId) {
      alert('Please select provider, group, and payer.'); return
    }
    if (locationMode === 'selected' && selectedLocationIds.length === 0) {
      alert('Please select at least one location.'); return
    }

    const { data: appData, error: appError } = await supabase
      .from('enrollment_applications')
      .insert([{ provider_id: providerId, group_id: groupId, payer_id: payerId,
        location_mode: locationMode, status: 'draft' }])
      .select().single()

    if (appError || !appData) { alert('Error creating application'); return }

    const ids = locationMode === 'all' ? locations.map((l) => l.id) : selectedLocationIds
    if (ids.length > 0) {
      const { error: locErr } = await supabase.from('enrollment_application_locations')
        .insert(ids.map((location_id) => ({ enrollment_application_id: appData.id, location_id })))
      if (locErr) { alert('Application created, but location links failed.'); return }
    }

    router.push('/applications')
  }

  return (
    <main className="page">
      <Link href="/applications" className="back-link">← Applications</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Application</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Provider</label>
            <select className="form-select" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
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
            <label className="form-label">Payer</label>
            <select className="form-select" name="payer_id">
              <option value="">Select Payer</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Location Mode</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'selected'] as LocationMode[]).map((mode) => (
                <label key={mode} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                  border: locationMode === mode ? '1px solid #6366f1' : '1px solid #e2e8f0',
                  backgroundColor: locationMode === mode ? '#eef2ff' : '#ffffff',
                  color: locationMode === mode ? '#4f46e5' : '#475569',
                  fontWeight: locationMode === mode ? 500 : 400,
                }}>
                  <input type="radio" name="locationMode" value={mode}
                    checked={locationMode === mode} onChange={() => setLocationMode(mode)}
                    style={{ accentColor: '#4f46e5' }} />
                  {mode === 'all' ? 'All assigned locations' : 'Selected locations only'}
                </label>
              ))}
            </div>
          </div>

          {providerId && groupId && (
            <div className="form-field">
              <label className="form-label">
                Assigned Locations
                {locationMode === 'all' && <span style={{ color: '#94a3b8', marginLeft: '6px', textTransform: 'none', fontWeight: 400 }}>(all included)</span>}
              </label>
              {locations.length ? (
                <div className="check-list">
                  {locations.map((loc) => {
                    const checked = locationMode === 'all' || selectedLocationIds.includes(loc.id)
                    const disabled = locationMode === 'all'
                    return (
                      <label key={loc.id}
                        className={`check-list-item${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}`}
                        style={{ userSelect: 'none' }}>
                        <input type="checkbox" checked={checked}
                          onChange={() => !disabled && toggleLocation(loc.id)}
                          disabled={disabled} style={{ accentColor: '#4f46e5', flexShrink: 0 }} />
                        <span style={{ color: disabled ? '#94a3b8' : '#334155', fontWeight: 500 }}>
                          {loc.name}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px 0' }}>
                  No assigned locations for this provider/group.
                </div>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '8px' }}>
            Create Application
          </button>
        </form>
      </div>
    </main>
  )
}
