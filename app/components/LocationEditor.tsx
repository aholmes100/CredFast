'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Location, LocationMode } from '../types'

interface AvailableLocation extends Pick<Location, 'id' | 'name' | 'address_1' | 'city' | 'state'> {}

interface Props {
  applicationId: string
  providerId: string
  groupId: string
  initialLocationMode: LocationMode
  initialLocationIds: string[]
}

export default function LocationEditor({
  applicationId, providerId, groupId, initialLocationMode, initialLocationIds,
}: Props) {
  const [locationMode, setLocationMode] = useState<LocationMode>(initialLocationMode)
  const [available, setAvailable] = useState<AvailableLocation[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(initialLocationIds)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    supabase.from('provider_group_locations')
      .select(`location_id, locations(id, name, address_1, city, state)`)
      .eq('provider_id', providerId).eq('group_id', groupId).eq('is_active', true)
      .then(({ data, error }) => {
        if (!error && data) {
          const locs = data
            .map((row) => (row as unknown as { locations: AvailableLocation | null }).locations)
            .filter((l): l is AvailableLocation => l !== null)
          setAvailable(locs)
        }
        setLoading(false)
      })
  }, [providerId, groupId])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    setIsDirty(true)
  }

  const changeMode = (mode: LocationMode) => { setLocationMode(mode); setIsDirty(true) }

  const handleSave = async () => {
    if (locationMode === 'selected' && selectedIds.length === 0) {
      setError('Select at least one location.'); return
    }
    setSaving(true); setError(null); setJustSaved(false)

    const idsToSave = locationMode === 'all' ? available.map((l) => l.id) : selectedIds

    const { error: delErr } = await supabase
      .from('enrollment_application_locations').delete()
      .eq('enrollment_application_id', applicationId)
    if (delErr) { setSaving(false); setError('Failed to update locations.'); return }

    if (idsToSave.length > 0) {
      const { error: insErr } = await supabase.from('enrollment_application_locations')
        .insert(idsToSave.map((location_id) => ({ enrollment_application_id: applicationId, location_id })))
      if (insErr) { setSaving(false); setError('Failed to save locations.'); return }
    }

    const { error: modeErr } = await supabase.from('enrollment_applications')
      .update({ location_mode: locationMode }).eq('id', applicationId)

    setSaving(false)
    if (modeErr) { setError('Locations saved, but mode update failed.'); return }

    setIsDirty(false); setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  const effectiveIds = locationMode === 'all' ? available.map((l) => l.id) : selectedIds

  return (
    <div>
      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['all', 'selected'] as LocationMode[]).map((mode) => (
          <button key={mode} type="button" onClick={() => changeMode(mode)}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
              border: locationMode === mode ? '1px solid #6366f1' : '1px solid #e2e8f0',
              backgroundColor: locationMode === mode ? '#eef2ff' : '#ffffff',
              color: locationMode === mode ? '#4f46e5' : '#64748b',
            }}>
            {mode === 'all' ? 'All assigned' : 'Selected only'}
          </button>
        ))}
      </div>

      {/* Location list */}
      {loading ? (
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>Loading…</p>
      ) : available.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#94a3b8' }}>No assigned locations for this provider/group.</p>
      ) : (
        <div className="check-list" style={{ marginBottom: '16px' }}>
          {available.map((loc) => {
            const checked  = effectiveIds.includes(loc.id)
            const disabled = locationMode === 'all'
            return (
              <label key={loc.id}
                className={`check-list-item${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}`}>
                <input type="checkbox" checked={checked}
                  onChange={() => !disabled && toggleId(loc.id)} disabled={disabled}
                  style={{ accentColor: '#4f46e5', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, color: disabled ? '#94a3b8' : '#0f172a', fontSize: '13px' }}>
                    {loc.name}
                  </div>
                  {loc.address_1 && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                      {loc.address_1}{loc.city ? `, ${loc.city}` : ''}{loc.state ? `, ${loc.state}` : ''}
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}

      {/* Save bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving || loading || !isDirty}
          className={isDirty && !saving ? 'btn btn-primary btn-sm' : 'btn btn-sm btn-disabled'}
          style={{ cursor: isDirty && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        {justSaved && !saving && (
          <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>
        )}
        {error && (
          <span style={{ fontSize: '13px', color: '#dc2626' }}>⚠ {error}</span>
        )}
      </div>
    </div>
  )
}
