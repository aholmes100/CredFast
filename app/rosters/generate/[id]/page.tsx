'use client'

import { useState, useEffect, useCallback, use } from 'react'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import type { RosterTemplateWithPayer } from '../../../types'

// ── Provider row data shapes ───────────────────────────────────────────────────

interface ProviderRow {
  id: string
  first_name: string
  last_name: string
  middle_name: string | null
  credential_suffix: string | null
  npi: string | null
  caqh_number: string | null
  dea_number: string | null
  specialty: string | null
  taxonomy_code: string | null
  gender: string | null
  license_number: string | null
  license_state: string | null
  accepting_new_patients: boolean | null
  date_of_birth: string | null
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
}

interface AssignmentRow {
  provider_id: string
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

// ── Field value formatters ─────────────────────────────────────────────────────

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
    // ISO date (YYYY-MM-DD) → MM/DD/YYYY
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
): Record<string, string> {
  return {
    first_name:             formatField('first_name',            provider.first_name),
    middle_name:            formatField('middle_name',           provider.middle_name),
    last_name:              formatField('last_name',             provider.last_name),
    credential_suffix:      formatField('credential_suffix',     provider.credential_suffix),
    npi:                    formatField('npi',                   provider.npi),
    caqh_number:            formatField('caqh_number',           provider.caqh_number),
    dea_number:             formatField('dea_number',            provider.dea_number),
    tax_id:                 formatField('tax_id',                group?.tax_id),
    specialty:              formatField('specialty',             provider.specialty),
    taxonomy_code:          formatField('taxonomy_code',         provider.taxonomy_code),
    gender:                 formatField('gender',                provider.gender),
    license_number:         formatField('license_number',        provider.license_number),
    license_state:          formatField('license_state',         provider.license_state),
    service_address:        formatField('service_address',       location?.address_1),
    service_address_2:      formatField('service_address_2',     location?.address_2),
    service_city:           formatField('service_city',          location?.city),
    service_state:          formatField('service_state',         location?.state),
    service_zip:            formatField('service_zip',           location?.zip),
    service_phone:          formatField('service_phone',         location?.phone),
    service_fax:            formatField('service_fax',           location?.fax),
    billing_address:        formatField('billing_address',       group?.billing_address_1),
    billing_address_2:      formatField('billing_address_2',     group?.billing_address_2),
    billing_city:           formatField('billing_city',          group?.billing_city),
    billing_state:          formatField('billing_state',         group?.billing_state),
    billing_zip:            formatField('billing_zip',           group?.billing_zip),
    billing_phone:          formatField('billing_phone',         group?.billing_phone),
    group_name:             formatField('group_name',            group?.name),
    group_npi:              formatField('group_npi',             group?.group_npi),
    accepting_new_patients: formatField('accepting_new_patients', provider.accepting_new_patients),
    date_of_birth:          formatField('date_of_birth',         provider.date_of_birth),
    network_effective_date: '',
    pcp_or_specialist:      '',
  }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function GenerateRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = use(params)

  const [template, setTemplate]       = useState<RosterTemplateWithPayer | null>(null)
  const [providers, setProviders]     = useState<ProviderListItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [generating, setGenerating]   = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const [{ data: tpl }, { data: provs }] = await Promise.all([
      supabase
        .from('roster_templates')
        .select('*, payers(name)')
        .eq('id', templateId)
        .single(),
      supabase
        .from('providers')
        .select('id, first_name, last_name, npi, specialty')
        .order('last_name'),
    ])

    setTemplate(tpl as unknown as RosterTemplateWithPayer)
    setProviders((provs ?? []) as ProviderListItem[])
    setLoading(false)
  }, [templateId])

  useEffect(() => { loadData() }, [loadData])

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
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(filteredProviders.map(p => p.id)))
  const deselectAll = () => setSelectedIds(new Set())

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!template || selectedIds.size === 0) return
    setGenerating(true)
    setGenerateError(null)

    try {
      // Get signed URL for template file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('rosters')
        .createSignedUrl(template.file_path, 120)

      if (urlError || !urlData?.signedUrl) throw new Error('Could not access template file')

      // Fetch template as ArrayBuffer and parse with SheetJS
      const buffer = await fetch(urlData.signedUrl).then(r => r.arrayBuffer())
      const wb = XLSX.read(buffer, { type: 'array' })

      const ws = wb.Sheets[template.sheet_name]
      if (!ws) throw new Error(`Sheet "${template.sheet_name}" not found in template`)

      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
      const headerRowIndex = template.header_row - 1 // 0-indexed

      // Map column header text → column index
      const colIndexByField: Record<string, number> = {}
      for (let col = range.s.c; col <= range.e.c; col++) {
        const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
        const headerText = ws[addr]?.v?.toString() ?? ''
        const mappedField = template.column_mappings[headerText]
        if (mappedField) colIndexByField[mappedField] = col
      }

      // Fetch full provider data for selected providers
      const selectedArr = Array.from(selectedIds)

      const [{ data: provData }, { data: assignData }] = await Promise.all([
        supabase
          .from('providers')
          .select(
            'id, first_name, last_name, middle_name, credential_suffix, npi, ' +
            'caqh_number, dea_number, specialty, taxonomy_code, gender, ' +
            'license_number, license_state, accepting_new_patients, date_of_birth'
          )
          .in('id', selectedArr),
        supabase
          .from('provider_group_locations')
          .select(
            'provider_id, ' +
            'groups(name, group_npi, tax_id, billing_address_1, billing_address_2, billing_city, billing_state, billing_zip, billing_phone), ' +
            'locations(address_1, address_2, city, state, zip, phone, fax)'
          )
          .in('provider_id', selectedArr)
          .eq('is_primary', true),
      ])

      const assignmentMap = new Map<string, AssignmentRow>(
        ((assignData as unknown as AssignmentRow[]) ?? []).map(a => [a.provider_id, a])
      )

      // Write provider rows into the worksheet
      const startRow = headerRowIndex + 1
      const provRows = (provData ?? []) as unknown as ProviderRow[]

      provRows.forEach((provider, i) => {
        const assignment = assignmentMap.get(provider.id)
        const rowData = buildProviderRow(
          provider,
          assignment?.groups ?? null,
          assignment?.locations ?? null,
        )
        const rowIndex = startRow + i

        for (const [field, colIndex] of Object.entries(colIndexByField)) {
          const value = rowData[field] ?? ''
          if (value !== '') {
            const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
            ws[addr] = { t: 's', v: value }
          }
        }
      })

      // Expand the sheet range to cover the new rows
      if (provRows.length > 0) {
        range.e.r = Math.max(range.e.r, startRow + provRows.length - 1)
        ws['!ref'] = XLSX.utils.encode_range(range)
      }

      // Build filename and trigger download
      const today = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
      const payerSlug = (template.payers?.name ?? 'Roster').replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${payerSlug}_Roster_${dateStr}.xlsx`

      XLSX.writeFile(wb, filename)
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

  const selectedCount = selectedIds.size
  const allFilteredSelected =
    filteredProviders.length > 0 && filteredProviders.every(p => selectedIds.has(p.id))

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
            Select providers to include in the roster
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={selectedCount === 0 || generating}
          onClick={handleGenerate}
        >
          {generating ? 'Generating…' : `Generate Roster (${selectedCount})`}
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

      {/* Search + select controls */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
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
        {selectedCount > 0 && (
          <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>
            {selectedCount} selected
          </span>
        )}
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
            const checked = selectedIds.has(provider.id)
            return (
              <div
                key={provider.id}
                onClick={() => toggleSelect(provider.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 160px 1fr',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: '1px solid #f1f5f9',
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
                <div style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>
                  {provider.specialty ?? '—'}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom action bar */}
      {selectedCount > 0 && (
        <div style={{
          position: 'sticky',
          bottom: '16px',
          marginTop: '16px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
        }}>
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
              {selectedCount} provider{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              className="btn btn-primary"
              disabled={generating}
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
