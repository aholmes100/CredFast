'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type AssignmentRow = {
  id: string
  is_primary: boolean
  is_active: boolean
  groups: { id: string; name: string } | null
  locations: { id: string; name: string; address_1: string | null; city: string | null; state: string | null } | null
}

type LocationRow = {
  id: string
  name: string
  facility_type: string | null
  group_id: string | null
  groups: { id: string; name: string; division_code: string | null } | null
}

type GroupOption = {
  id: string
  name: string
  division_code: string | null
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
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as AssignmentRow[]
}

export default function ProviderLocationsTab({ providerId, orgId, initialAssignments }: Props) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>(initialAssignments)

  // Add-section data
  const [allLocations,   setAllLocations]   = useState<LocationRow[]>([])
  const [allGroups,      setAllGroups]      = useState<GroupOption[]>([])
  const [loadingData,    setLoadingData]    = useState(true)
  const [search,         setSearch]         = useState('')
  const [filterGroupId,  setFilterGroupId]  = useState('')
  const [checked,        setChecked]        = useState<Set<string>>(new Set())
  const [adding,         setAdding]         = useState(false)
  const [addError,       setAddError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: locData }, { data: grpData }] = await Promise.all([
        supabase
          .from('locations')
          .select('id, name, facility_type, group_id, groups!left(id, name, division_code)')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('groups')
          .select('id, name, division_code')
          .order('name'),
      ])
      setAllLocations((locData ?? []) as unknown as LocationRow[])
      setAllGroups((grpData ?? []) as unknown as GroupOption[])
      setLoadingData(false)
    }
    load()
  }, [])

  const assignedIds = useMemo(
    () => new Set(assignments.map(a => a.locations?.id).filter(Boolean) as string[]),
    [assignments]
  )

  const groupsWithLocations = useMemo(() => {
    const ids = new Set(allLocations.map(l => l.group_id).filter(Boolean))
    return allGroups.filter(g => ids.has(g.id))
  }, [allLocations, allGroups])

  const filteredLocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allLocations.filter(l => {
      if (assignedIds.has(l.id)) return false
      if (filterGroupId && l.group_id !== filterGroupId) return false
      if (q && !l.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [allLocations, assignedIds, search, filterGroupId])

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddSelected = async () => {
    if (checked.size === 0) return
    setAdding(true)
    setAddError(null)
    const locIds = Array.from(checked)
    const rows = locIds.map((locId, i) => {
      const loc = allLocations.find(l => l.id === locId)!
      return {
        organization_id: orgId,
        provider_id:     providerId,
        group_id:        loc.group_id,
        location_id:     locId,
        is_primary:      assignments.length === 0 && i === 0,
        is_active:       true,
      }
    })
    const { error: insertError } = await supabase
      .from('provider_group_locations')
      .insert(rows)
    if (insertError) {
      setAddError('Failed to add locations.')
      setAdding(false)
      return
    }
    const fresh = await refetchAssignments(providerId)
    setAssignments(fresh)
    setChecked(new Set())
    setAdding(false)
  }

  const handleSetPrimary = async (assignmentId: string) => {
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

      {/* ── Assigned Locations ──────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '16px' }}>
        <p className="section-label">Assigned Locations</p>
        {assignments.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>
            No locations assigned yet. Select locations below to assign this provider.
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

      {/* ── Add Locations ───────────────────────────────── */}
      <div className="card-lg">
        <p className="section-label">Add Locations</p>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: 1, minWidth: '180px' }}>
            <span className="search-wrap-icon">
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </span>
            <input
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search locations…"
            />
            {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
          </div>
          <select
            className="form-select"
            value={filterGroupId}
            onChange={e => setFilterGroupId(e.target.value)}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            <option value="">All Groups</option>
            {groupsWithLocations.map(g => (
              <option key={g.id} value={g.id}>
                {g.division_code ? `${g.division_code} | ${g.name}` : g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Checklist */}
        {loadingData ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>
            Loading locations…
          </div>
        ) : filteredLocs.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '16px 0', textAlign: 'center' }}>
            No locations found.
          </div>
        ) : (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', maxHeight: '360px', overflowY: 'auto' }}>
            {filteredLocs.map((loc, idx) => (
              <label
                key={loc.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px',
                  borderBottom: idx < filteredLocs.length - 1 ? '1px solid #f1f5f9' : 'none',
                  cursor: 'pointer',
                  backgroundColor: checked.has(loc.id) ? '#f5f3ff' : 'transparent',
                }}
              >
                <input
                  type="checkbox"
                  checked={checked.has(loc.id)}
                  onChange={() => toggleCheck(loc.id)}
                  style={{ accentColor: '#4f46e5', width: '15px', height: '15px', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{loc.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                    {loc.groups?.name ?? '—'}
                  </div>
                </div>
                {loc.facility_type && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: '#64748b',
                    backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {loc.facility_type}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className={checked.size > 0 && !adding ? 'btn btn-primary btn-sm' : 'btn btn-disabled btn-sm'}
            onClick={handleAddSelected}
            disabled={checked.size === 0 || adding}
            style={{ cursor: checked.size > 0 && !adding ? 'pointer' : 'not-allowed' }}
          >
            {adding ? 'Adding…' : `Add Selected${checked.size > 0 ? ` (${checked.size})` : ''}`}
          </button>
          {checked.size > 0 && !adding && (
            <button
              onClick={() => setChecked(new Set())}
              style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Clear selection
            </button>
          )}
          {addError && (
            <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {addError}</span>
          )}
        </div>
      </div>
    </div>
  )
}
