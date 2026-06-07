'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type AssignmentRow = {
  id: string
  is_primary: boolean
  is_active: boolean
  groups: { id: string; name: string } | null
  locations: { id: string; name: string; address_1: string | null; city: string | null; state: string | null } | null
}

interface Props {
  providerId: string
  orgId: string
  initialAssignments: AssignmentRow[]
}

async function refetchAssignments(providerId: string): Promise<AssignmentRow[]> {
  const { data } = await supabase
    .from('provider_group_locations')
    .select('id, is_primary, is_active, groups(id, name), locations(id, name, address_1, city, state)')
    .eq('provider_id', providerId)
    .eq('is_active', true)
  return (data ?? []) as unknown as AssignmentRow[]
}

export default function ProviderLocationsTab({ providerId, orgId, initialAssignments }: Props) {
  const [assignments,    setAssignments]    = useState<AssignmentRow[]>(initialAssignments)
  const [showAdd,        setShowAdd]        = useState(false)
  const [groups,         setGroups]         = useState<{ id: string; name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [availableLocs,  setAvailableLocs]  = useState<{ id: string; name: string; address_1: string | null; city: string | null; state: string | null }[]>([])
  const [selectedLocId,  setSelectedLocId]  = useState('')
  const [loadingGroups,  setLoadingGroups]  = useState(false)
  const [loadingLocs,    setLoadingLocs]    = useState(false)
  const [adding,         setAdding]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const openAdd = async () => {
    setShowAdd(true)
    setSelectedGroupId('')
    setSelectedLocId('')
    setAvailableLocs([])
    setError(null)
    if (groups.length === 0) {
      setLoadingGroups(true)
      const { data } = await supabase.from('groups').select('id, name').order('name')
      setGroups((data ?? []) as { id: string; name: string }[])
      setLoadingGroups(false)
    }
  }

  const handleGroupChange = async (groupId: string) => {
    setSelectedGroupId(groupId)
    setSelectedLocId('')
    setAvailableLocs([])
    if (!groupId) return
    setLoadingLocs(true)
    const { data } = await supabase
      .from('locations')
      .select('id, name, address_1, city, state')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('name')
    const assignedIds = new Set(assignments.map(a => a.locations?.id).filter(Boolean))
    const filtered = ((data ?? []) as { id: string; name: string; address_1: string | null; city: string | null; state: string | null }[])
      .filter(l => !assignedIds.has(l.id))
    setAvailableLocs(filtered)
    setLoadingLocs(false)
  }

  const handleAdd = async () => {
    if (!selectedGroupId || !selectedLocId) { setError('Select both a group and a location.'); return }
    setAdding(true); setError(null)
    const { error: insertError } = await supabase.from('provider_group_locations').insert({
      provider_id:     providerId,
      group_id:        selectedGroupId,
      location_id:     selectedLocId,
      is_primary:      assignments.length === 0,
      is_active:       true,
      organization_id: orgId,
    })
    if (insertError) { setError('Failed to add location.'); setAdding(false); return }
    const fresh = await refetchAssignments(providerId)
    setAssignments(fresh)
    setShowAdd(false)
    setSelectedGroupId('')
    setSelectedLocId('')
    setAvailableLocs([])
    setAdding(false)
  }

  const handleSetPrimary = async (assignmentId: string) => {
    // Clear all primary flags for this provider, then set the selected one
    await supabase
      .from('provider_group_locations')
      .update({ is_primary: false })
      .eq('provider_id', providerId)
    await supabase
      .from('provider_group_locations')
      .update({ is_primary: true })
      .eq('id', assignmentId)
    const fresh = await refetchAssignments(providerId)
    setAssignments(fresh)
  }

  const handleRemove = async (assignmentId: string) => {
    await supabase
      .from('provider_group_locations')
      .update({ is_active: false })
      .eq('id', assignmentId)
    setAssignments(prev => prev.filter(a => a.id !== assignmentId))
  }

  return (
    <div style={{ maxWidth: '860px' }}>
      <div className="card-lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p className="section-label" style={{ margin: 0 }}>Assigned Locations</p>
          {!showAdd && (
            <button className="btn btn-secondary btn-sm" onClick={openAdd} style={{ cursor: 'pointer' }}>
              + Add Location
            </button>
          )}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="add-form" style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '10px' }}>Add a location</p>
            <div className="add-form-row">
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Group</label>
                <select
                  className="form-select"
                  value={selectedGroupId}
                  onChange={e => handleGroupChange(e.target.value)}
                  disabled={loadingGroups}
                >
                  <option value="">{loadingGroups ? 'Loading…' : 'Select group'}</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '180px' }}>
                <label className="form-label">Location</label>
                <select
                  className="form-select"
                  value={selectedLocId}
                  onChange={e => setSelectedLocId(e.target.value)}
                  disabled={!selectedGroupId || loadingLocs}
                >
                  <option value="">
                    {!selectedGroupId ? 'Select group first' : loadingLocs ? 'Loading…' : availableLocs.length === 0 ? 'No unassigned locations' : 'Select location'}
                  </option>
                  {availableLocs.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name}{l.city ? ` · ${l.city}, ${l.state}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleAdd}
                  disabled={adding || !selectedGroupId || !selectedLocId}
                  style={{ cursor: adding || !selectedGroupId || !selectedLocId ? 'not-allowed' : 'pointer' }}
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowAdd(false); setError(null) }}
                  style={{ cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
            {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{error}</p>}
          </div>
        )}

        {/* Assignment list */}
        {assignments.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
            No locations assigned yet. Use &ldquo;Add Location&rdquo; to assign this provider to a practice site.
          </div>
        ) : (
          <div className="row-list">
            {assignments.map(a => (
              <div key={a.id} className="row-list-item" style={{ justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                      {a.locations?.name ?? '—'}
                    </span>
                    {a.is_primary && (
                      <span style={{ fontSize: '10px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Primary</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {a.groups?.name ?? ''}
                    {a.locations?.city && ` · ${a.locations.city}, ${a.locations.state}`}
                    {a.locations?.address_1 && ` · ${a.locations.address_1}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {!a.is_primary && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSetPrimary(a.id)}
                      style={{ cursor: 'pointer', fontSize: '11px' }}
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => handleRemove(a.id)}
                    style={{ cursor: 'pointer', fontSize: '11px', backgroundColor: '#fef2f2', color: '#b91c1c' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
