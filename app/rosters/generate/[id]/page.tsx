'use client'

import { useState, useEffect, useCallback, use } from 'react'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import type { RosterTemplateWithPayer } from '../../../types'

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface ProviderRow {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  credential_suffix: string | null
  npi: string | null
  caqh_number: string | null
  dea_number: string | null
  ssn: string | null
  email: string | null
  specialty: string | null
  taxonomy_code: string | null
  gender: string | null
  license_number: string | null
  license_state: string | null
  accepting_new_patients: boolean | null
  date_of_birth: string | null
  medicaid_number: string | null
  medicaid_state: string | null
  medicare_number: string | null
  credentialing_contact_name: string | null
  credentialing_contact_email: string | null
  credentialing_contact_phone: string | null
}

interface GroupRow {
  name: string | null
  group_npi: string | null
  tax_id: string | null
  billing_address_1: string | null
  billing_address_2: string | null
  billing_city: string | null
  billing_state: string | null
  billing_zip: string | null
  billing_phone: string | null
}

interface LocationRow {
  address_1: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  fax: string | null
  hours_monday:    string | null
  hours_tuesday:   string | null
  hours_wednesday: string | null
  hours_thursday:  string | null
  hours_friday:    string | null
  hours_saturday:  string | null
  hours_sunday:    string | null
}

interface AssignmentRow {
  provider_id: string
  location_id: string
  group_npi_override: string | null
  groups: GroupRow | null
  locations: LocationRow | null
}

interface ProviderListItem {
  id: string
  first_name: string
  last_name: string
  npi: string | null
  specialty: string | null
}

interface LocationListItem {
  id: string
  name: string | null
  address_1: string | null
  city: string | null
  state: string | null
}

interface ProvLocAssignment {
  provider_id: string
  location_id: string
  locations: { name: string | null; address_1: string | null; city: string | null; state: string | null } | null
}

// ── Field formatters ───────────────────────────────────────────────────────────

function formatField(field: string, value: unknown): string {
  if (value === null || value === undefined) return ''

  if (field === 'accepting_new_patients') {
    if (value === true  || value === 'true'  || value === 'y' || value === 'yes') return 'Y'
    if (value === false || value === 'false' || value === 'n' || value === 'no')  return 'N'
    return ''
  }

  if (field === 'gender') {
    const g = String(value).trim().toLowerCase()
    if (g === 'm' || g === 'male')   return 'Male'
    if (g === 'f' || g === 'female') return 'Female'
    return ''
  }

  if (field === 'date_of_birth') {
    const v = String(value).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split('-')
      return `${m}/${d}/${y}`
    }
    return v
  }

  return String(value)
}

function buildProviderRow(
  provider: ProviderRow,
  group: GroupRow | null,
  location: LocationRow | null,
  assignment?: AssignmentRow | null,
): Record<string, string> {
  return {
    first_name:                  formatField('first_name',                  provider.first_name),
    middle_name:                 formatField('middle_name',                 provider.middle_name),
    last_name:                   formatField('last_name',                   provider.last_name),
    credential_suffix:           formatField('credential_suffix',           provider.credential_suffix),
    npi:                         formatField('npi',                         provider.npi),
    caqh_number:                 formatField('caqh_number',                 provider.caqh_number),
    dea_number:                  formatField('dea_number',                  provider.dea_number),
    ssn:                         formatField('ssn',                         provider.ssn),
    email:                       formatField('email',                       provider.email),
    tax_id:                      formatField('tax_id',                      group?.tax_id),
    specialty:                   formatField('specialty',                   provider.specialty),
    taxonomy_code:               formatField('taxonomy_code',               provider.taxonomy_code),
    gender:                      formatField('gender',                      provider.gender),
    license_number:              formatField('license_number',              provider.license_number),
    license_state:               formatField('license_state',               provider.license_state),
    service_address:             formatField('service_address',             location?.address_1),
    service_address_2:           formatField('service_address_2',           location?.address_2),
    service_city:                formatField('service_city',                location?.city),
    service_state:               formatField('service_state',               location?.state),
    service_zip:                 formatField('service_zip',                 location?.zip),
    service_phone:               formatField('service_phone',               location?.phone),
    service_fax:                 formatField('service_fax',                 location?.fax),
    billing_address:             formatField('billing_address',             group?.billing_address_1),
    billing_address_2:           formatField('billing_address_2',           group?.billing_address_2),
    billing_city:                formatField('billing_city',                group?.billing_city),
    billing_state:               formatField('billing_state',               group?.billing_state),
    billing_zip:                 formatField('billing_zip',                 group?.billing_zip),
    billing_phone:               formatField('billing_phone',               group?.billing_phone),
    group_name:                  formatField('group_name',                  group?.name),
    group_npi:                   formatField('group_npi',                   assignment?.group_npi_override || group?.group_npi),
    accepting_new_patients:      formatField('accepting_new_patients',      provider.accepting_new_patients),
    date_of_birth:               formatField('date_of_birth',               provider.date_of_birth),
    medicaid_number:             formatField('medicaid_number',             provider.medicaid_number),
    medicaid_state:              formatField('medicaid_state',              provider.medicaid_state),
    medicare_number:             formatField('medicare_number',             provider.medicare_number),
    credentialing_contact_name:  formatField('credentialing_contact_name',  provider.credentialing_contact_name),
    credentialing_contact_email: formatField('credentialing_contact_email', provider.credentialing_contact_email),
    credentialing_contact_phone: formatField('credentialing_contact_phone', provider.credentialing_contact_phone),
    hours_monday:                formatField('hours_monday',    location?.hours_monday),
    hours_tuesday:               formatField('hours_tuesday',   location?.hours_tuesday),
    hours_wednesday:             formatField('hours_wednesday', location?.hours_wednesday),
    hours_thursday:              formatField('hours_thursday',  location?.hours_thursday),
    hours_friday:                formatField('hours_friday',    location?.hours_friday),
    hours_saturday:              formatField('hours_saturday',  location?.hours_saturday),
    hours_sunday:                formatField('hours_sunday',    location?.hours_sunday),
    network_effective_date: '',
    pcp_or_specialist:      '',
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GenerateRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = use(params)

  const [template, setTemplate]           = useState<RosterTemplateWithPayer | null>(null)
  const [providers, setProviders]         = useState<ProviderListItem[]>([])
  const [providerLocMap, setProviderLocMap] = useState<Map<string, LocationListItem[]>>(new Map())
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  // provider_id → set of location_ids to include
  const [selectedLocations, setSelectedLocations] = useState<Map<string, Set<string>>>(new Map())
  const [search, setSearch]               = useState('')
  const [loading, setLoading]             = useState(true)
  const [generating, setGenerating]       = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [preSelectId, setPreSelectId]     = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [{ data: tpl }, { data: provs }, { data: allAssigns }] = await Promise.all([
      supabase
        .from('roster_templates')
        .select('*, payers(name)')
        .eq('id', templateId)
        .single(),
      supabase
        .from('providers')
        .select('id, first_name, last_name, npi, specialty')
        .order('last_name'),
      supabase
        .from('provider_group_locations')
        .select('provider_id, location_id, locations(name, address_1, city, state)'),
    ])

    setTemplate(tpl as unknown as RosterTemplateWithPayer)
    setProviders((provs ?? []) as ProviderListItem[])

    // Build provider → locations map, deduplicating by location_id
    const locMap = new Map<string, LocationListItem[]>()
    for (const a of (allAssigns as unknown as ProvLocAssignment[]) ?? []) {
      if (!a.location_id) continue
      const list = locMap.get(a.provider_id) ?? []
      if (!list.some(l => l.id === a.location_id)) {
        list.push({
          id:        a.location_id,
          name:      a.locations?.name ?? null,
          address_1: a.locations?.address_1 ?? null,
          city:      a.locations?.city ?? null,
          state:     a.locations?.state ?? null,
        })
      }
      locMap.set(a.provider_id, list)
    }
    setProviderLocMap(locMap)
    setLoading(false)
  }, [templateId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pid = new URLSearchParams(window.location.search).get('provider_id')
      if (pid) setPreSelectId(pid)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Pre-select provider from URL param once data is loaded
  useEffect(() => {
    if (loading || !preSelectId || selectedIds.has(preSelectId)) return
    const locs = providerLocMap.get(preSelectId) ?? []
    setSelectedIds(prev => { const next = new Set(prev); next.add(preSelectId); return next })
    setSelectedLocations(prev => {
      const next = new Map(prev)
      next.set(preSelectId, new Set(locs.map(l => l.id)))
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, preSelectId])

  // ── Selection helpers ────────────────────────────────────────────────────────

  const filteredProviders = providers.filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      (p.npi ?? '').includes(q)
    )
  })

  const toggleSelect = (id: string) => {
    const wasSelected = selectedIds.has(id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (wasSelected) next.delete(id); else next.add(id)
      return next
    })
    setSelectedLocations(prev => {
      const next = new Map(prev)
      if (wasSelected) {
        next.delete(id)
      } else {
        const locs = providerLocMap.get(id) ?? []
        next.set(id, new Set(locs.map(l => l.id)))
      }
      return next
    })
  }

  const toggleLocation = (providerId: string, locationId: string) => {
    setSelectedLocations(prev => {
      const next = new Map(prev)
      const locs = new Set(next.get(providerId) ?? [])
      if (locs.has(locationId)) locs.delete(locationId); else locs.add(locationId)
      next.set(providerId, locs)
      return next
    })
  }

  const selectAll = () => {
    const newIds = new Set<string>(selectedIds)
    const newLocs = new Map<string, Set<string>>(selectedLocations)
    filteredProviders.forEach(p => {
      newIds.add(p.id)
      const locs = providerLocMap.get(p.id) ?? []
      newLocs.set(p.id, new Set(locs.map(l => l.id)))
    })
    setSelectedIds(newIds)
    setSelectedLocations(newLocs)
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
    setSelectedLocations(new Map())
  }

  // Derived counts
  const selectedCount  = selectedIds.size
  const totalLocations = Array.from(selectedLocations.values())
    .reduce((sum, locs) => sum + locs.size, 0)
  const allFilteredSelected =
    filteredProviders.length > 0 && filteredProviders.every(p => selectedIds.has(p.id))

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!template || selectedCount === 0) return
    setGenerating(true)
    setGenerateError(null)

    try {
      const { data: urlData, error: urlError } = await supabase.storage
        .from('rosters')
        .createSignedUrl(template.file_path, 120)

      if (urlError || !urlData?.signedUrl) throw new Error('Could not access template file')

      const buffer = await fetch(urlData.signedUrl).then(r => r.arrayBuffer())
      const wb = XLSX.read(buffer, { type: 'array' })

      const ws = wb.Sheets[template.sheet_name]
      if (!ws) throw new Error(`Sheet "${template.sheet_name}" not found in template`)

      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      const headerRowIndex = template.header_row - 1

      // Build field → column index(es) map
      const colIndexByField: Record<string, number[]> = {}
      for (let col = range.s.c; col <= range.e.c; col++) {
        const addr        = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
        const headerText  = ws[addr]?.v?.toString() ?? ''
        const mappedField = template.column_mappings[headerText]
        if (mappedField) {
          if (!colIndexByField[mappedField]) colIndexByField[mappedField] = []
          colIndexByField[mappedField].push(col)
        }
      }

      const selectedArr = Array.from(selectedIds)

      // Fetch full provider data + ALL assignments (no is_primary filter)
      const [{ data: provData }, { data: assignData }] = await Promise.all([
        supabase
          .from('providers')
          .select(
            'id, first_name, last_name, middle_name, credential_suffix, npi, ' +
            'caqh_number, dea_number, ssn, email, specialty, taxonomy_code, gender, ' +
            'license_number, license_state, accepting_new_patients, date_of_birth, ' +
            'medicaid_number, medicaid_state, medicare_number, ' +
            'credentialing_contact_name, credentialing_contact_email, credentialing_contact_phone'
          )
          .in('id', selectedArr),
        supabase
          .from('provider_group_locations')
          .select(
            'provider_id, location_id, group_npi_override, ' +
            'groups(name, group_npi, tax_id, billing_address_1, billing_address_2, billing_city, billing_state, billing_zip, billing_phone), ' +
            'locations(address_1, address_2, city, state, zip, phone, fax, hours_monday, hours_tuesday, hours_wednesday, hours_thursday, hours_friday, hours_saturday, hours_sunday)'
          )
          .in('provider_id', selectedArr),
      ])

      // Index assignments by provider
      const assignsByProvider = new Map<string, AssignmentRow[]>()
      for (const a of (assignData as unknown as AssignmentRow[]) ?? []) {
        const list = assignsByProvider.get(a.provider_id) ?? []
        list.push(a)
        assignsByProvider.set(a.provider_id, list)
      }

      // Write rows — one per (provider, selected location)
      const startRow = headerRowIndex + 1
      let rowOffset  = 0

      const writeRow = (rowIndex: number, rowData: Record<string, string>) => {
        for (const [field, colIndexes] of Object.entries(colIndexByField)) {
          const value = rowData[field] ?? ''
          if (value !== '') {
            for (const colIndex of colIndexes) {
              const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
              ws[addr] = { t: 's', v: value }
            }
          }
        }
      }

      for (const provider of (provData ?? []) as unknown as ProviderRow[]) {
        const selectedLocIds = selectedLocations.get(provider.id) ?? new Set()
        const matchingAssigns = (assignsByProvider.get(provider.id) ?? [])
          .filter(a => selectedLocIds.has(a.location_id))

        if (matchingAssigns.length === 0) {
          // Provider selected but no location assignments — write one row with blank address
          writeRow(startRow + rowOffset, buildProviderRow(provider, null, null, null))
          rowOffset++
        } else {
          for (const assign of matchingAssigns) {
            writeRow(startRow + rowOffset, buildProviderRow(provider, assign.groups, assign.locations, assign))
            rowOffset++
          }
        }
      }

      if (rowOffset > 0) {
        range.e.r = Math.max(range.e.r, startRow + rowOffset - 1)
        ws['!ref'] = XLSX.utils.encode_range(range)
      }

      const today = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr  = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
      const payerSlug = (template.payers?.name ?? 'Roster').replace(/[^a-zA-Z0-9]/g, '_')
      XLSX.writeFile(wb, `${payerSlug}_Roster_${dateStr}.xlsx`)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="page">
        <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px 0' }}>Loading…</div>
      </main>
    )
  }

  if (!template) {
    return (
      <main className="page">
        <div className="alert-error">Template not found.</div>
        <Link href="/rosters" className="btn btn-secondary" style={{ marginTop: '12px', display: 'inline-block' }}>
          ← Back to Rosters
        </Link>
      </main>
    )
  }

  return (
    <main className="page-xl">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link href="/rosters" style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'none' }}>
              Rosters
            </Link>
            <span style={{ color: '#cbd5e1' }}>›</span>
            <span style={{ fontSize: '13px', color: '#475569' }}>Generate</span>
          </div>
          <h1 className="page-title">{template.name}</h1>
          <p className="page-subtitle">
            {template.payers?.name && <>{template.payers.name} · </>}
            Select providers and locations to include in the roster
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={totalLocations === 0 || generating}
          onClick={handleGenerate}
        >
          {generating ? 'Generating…' : `Generate Roster (${totalLocations} row${totalLocations !== 1 ? 's' : ''})`}
        </button>
      </div>

      {generateError && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#b91c1c',
        }}>
          {generateError}
        </div>
      )}

      {/* Search + controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
        <div className="search-wrap" style={{ flex: 1, maxWidth: '360px' }}>
          <input
            className="search-input"
            type="text"
            placeholder="Search by name or NPI…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>×</button>
          )}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={allFilteredSelected ? deselectAll : selectAll}>
          {allFilteredSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      {/* Summary */}
      <div style={{ fontSize: '12px', color: selectedCount > 0 ? '#4f46e5' : '#94a3b8', fontWeight: 600, marginBottom: '12px', minHeight: '18px' }}>
        {selectedCount > 0
          ? `${selectedCount} provider${selectedCount !== 1 ? 's' : ''} · ${totalLocations} location${totalLocations !== 1 ? 's' : ''} selected`
          : 'No providers selected'}
      </div>

      {/* Provider list */}
      <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 160px 1fr',
          gap: '12px',
          padding: '10px 16px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}>
          {['', 'Provider', 'NPI', 'Specialty'].map(h => (
            <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
              {h}
            </span>
          ))}
        </div>

        {filteredProviders.length === 0 ? (
          <div style={{ padding: '32px 16px', fontSize: '13px', color: '#94a3b8', textAlign: 'center' }}>
            {search ? 'No providers match your search.' : 'No providers found.'}
          </div>
        ) : (
          filteredProviders.map(provider => {
            const checked   = selectedIds.has(provider.id)
            const locations = providerLocMap.get(provider.id) ?? []
            const selLocs   = selectedLocations.get(provider.id) ?? new Set()

            return (
              <div key={provider.id}>
                {/* Provider row */}
                <div
                  onClick={() => toggleSelect(provider.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 160px 1fr',
                    gap: '12px',
                    padding: '10px 16px',
                    borderBottom: checked && locations.length > 0 ? 'none' : '1px solid #f1f5f9',
                    cursor: 'pointer',
                    backgroundColor: checked ? '#f5f3ff' : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc' }}
                  onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(provider.id)}
                      onClick={e => e.stopPropagation()}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', alignSelf: 'center' }}>
                    {provider.last_name}, {provider.first_name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace', alignSelf: 'center' }}>
                    {provider.npi ?? '—'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{provider.specialty ?? '—'}</span>
                    {checked && locations.length > 0 && (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {selLocs.size}/{locations.length} location{locations.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Location sub-rows (shown when provider is selected) */}
                {checked && locations.length > 0 && (
                  <div style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {locations.map(loc => {
                      const locChecked = selLocs.has(loc.id)
                      const addressParts = [loc.address_1, loc.city, loc.state].filter(Boolean)
                      return (
                        <div
                          key={loc.id}
                          onClick={e => { e.stopPropagation(); toggleLocation(provider.id, loc.id) }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '7px 16px 7px 56px',
                            cursor: 'pointer',
                            backgroundColor: locChecked ? '#ede9fe' : '#f5f3ff',
                            borderTop: '1px solid rgba(79,70,229,0.06)',
                            transition: 'background-color 0.1s',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = locChecked ? '#ddd6fe' : '#ede9fe' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = locChecked ? '#ede9fe' : '#f5f3ff' }}
                        >
                          <input
                            type="checkbox"
                            checked={locChecked}
                            onChange={() => toggleLocation(provider.id, loc.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ cursor: 'pointer', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>
                              {loc.name ?? 'Location'}
                            </div>
                            {addressParts.length > 0 && (
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                                {addressParts.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Provider with no locations note */}
                {checked && locations.length === 0 && (
                  <div style={{
                    padding: '6px 16px 6px 56px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    backgroundColor: '#f5f3ff',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    No locations assigned — will generate one row with blank service address
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Sticky bottom bar */}
      {selectedCount > 0 && (
        <div style={{ position: 'sticky', bottom: '16px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            <span style={{ fontSize: '13px', color: '#475569' }}>
              {selectedCount} provider{selectedCount !== 1 ? 's' : ''} · {totalLocations} location{totalLocations !== 1 ? 's' : ''}
            </span>
            <button
              className="btn btn-primary"
              disabled={totalLocations === 0 || generating}
              onClick={handleGenerate}
            >
              {generating ? 'Generating…' : 'Generate Roster'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
