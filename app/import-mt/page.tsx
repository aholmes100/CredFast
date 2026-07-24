'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { useOrganizationId } from '../lib/use-organization-id'

// ── Types ──────────────────────────────────────────────────────────────────────
type MtStep = 'idle' | 'previewing' | 'importing' | 'done'

interface FlaggedRow { rowIndex: number; label: string; reason: string }
interface MtResult { imported: number; skipped: number; flagged: FlaggedRow[] }

// ── Pure helpers ───────────────────────────────────────────────────────────────
function parseXlsxFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('Empty file')
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false }) as unknown[][]
        const headerRow = (raw[0] ?? []) as unknown[]
        const headers = headerRow.map(h => (h == null ? '' : String(h)).trim())
        const rows = (raw.slice(1) as unknown[][])
          .map(row => headers.map((_, i) => (row[i] == null ? '' : String(row[i])).trim()))
          .filter(r => r.some(c => c.length > 0))
        resolve({ headers, rows })
      } catch (err) { reject(err) }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsArrayBuffer(file)
  })
}

function parseMultiValue(cell: string): string[][] {
  if (!cell?.trim()) return []
  return cell.split('\n')
    .map(line => line.split('|').map(p => p.trim()))
    .filter(parts => parts.some(p => p.length > 0))
}

function normalizeDate(val: string): string | null {
  const v = (val ?? '').trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}

function ci(headers: string[], name: string): number {
  const lo = name.toLowerCase()
  return headers.findIndex(h => h.toLowerCase() === lo)
}

function cv(row: string[], idx: number): string {
  return idx >= 0 ? (row[idx] ?? '') : ''
}

// ── Locations import logic ─────────────────────────────────────────────────────
async function importLocations(
  orgId: string,
  headers: string[],
  rows: string[][],
  onProgress: (p: number) => void,
): Promise<MtResult> {
  const C = {
    division:    ci(headers, 'division'),
    name:        ci(headers, 'location name'),
    type:        ci(headers, 'location type'),
    address:     ci(headers, 'location address'),
    state:       ci(headers, 'location state'),
    zip:         ci(headers, 'location zip code'),
    county:      ci(headers, 'location county'),
    email:       ci(headers, 'location email address'),
    mailing:     ci(headers, 'mailing address'),
    phone:       ci(headers, 'location phone number'),
    fax:         ci(headers, 'location fax number'),
    taxId:       ci(headers, 'tax id'),
    legalName:   ci(headers, 'legal business name (lbn)'),
    dba:         ci(headers, 'dba'),
    credName:    ci(headers, 'credentialing contact name'),
    credPhone:   ci(headers, 'credentialing contact phone number'),
    credFax:     ci(headers, 'credentialing contact fax number'),
    credEmail:   ci(headers, 'credentialing contact e-mail'),
    grpMedicaid: ci(headers, 'group medicaid number'),
    grpMedicare: ci(headers, 'group medicare number'),
    orgNpi:      ci(headers, 'org npis numbers'),
    orgTaxonomy: ci(headers, 'org npis primary taxonomies'),
  }

  const [{ data: groupsData }, { data: locData }] = await Promise.all([
    supabase.from('groups').select('id, name, division_code').eq('organization_id', orgId),
    supabase.from('locations').select('group_id, name').eq('organization_id', orgId),
  ])

  const groupByDiv = new Map<string, { id: string; name: string }>()
  for (const g of (groupsData ?? []) as { id: string; name: string; division_code: string | null }[]) {
    if (g.division_code) groupByDiv.set(g.division_code.toLowerCase(), { id: g.id, name: g.name })
  }

  const existingLocSet = new Set<string>()
  for (const l of (locData ?? []) as { group_id: string | null; name: string }[]) {
    if (l.group_id && l.name) existingLocSet.add(`${l.group_id}:${l.name.toLowerCase()}`)
  }

  let imported = 0, skipped = 0
  const flagged: FlaggedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    onProgress(Math.round((i / rows.length) * 100))
    const row = rows[i]
    const divCode = cv(row, C.division)
    const locName = cv(row, C.name)
    const group = divCode ? groupByDiv.get(divCode.toLowerCase()) : undefined

    if (!group) {
      flagged.push({ rowIndex: i, label: locName || `Row ${i + 2}`, reason: `Division "${divCode || '(blank)'}" not found — add this group to CredFast first` })
      continue
    }
    if (!locName) {
      flagged.push({ rowIndex: i, label: `Row ${i + 2} (${group.name})`, reason: 'Missing location name' })
      continue
    }

    const dupKey = `${group.id}:${locName.toLowerCase()}`
    if (existingLocSet.has(dupKey)) { skipped++; continue }

    const grpMed = cv(row, C.grpMedicaid)
    const grpMcare = cv(row, C.grpMedicare)
    if (grpMed || grpMcare) {
      flagged.push({
        rowIndex: i, label: locName,
        reason: `Group Medicaid/Medicare identifiers (${[grpMed, grpMcare].filter(Boolean).join(' / ')}) — multi-state identifier import not yet supported`,
      })
    }

    const emailVal = cv(row, C.email)
    const { error: locErr } = await supabase.from('locations').insert({
      organization_id:    orgId,
      group_id:           group.id,
      name:               locName,
      facility_type:      cv(row, C.type) || null,
      address_1:          cv(row, C.address) || null,
      state:              cv(row, C.state) || null,
      zip:                cv(row, C.zip) || null,
      county:             cv(row, C.county) || null,
      mailing_address_1:  cv(row, C.mailing) || null,
      phone:              cv(row, C.phone) || null,
      fax:                cv(row, C.fax) || null,
      notes:              emailVal ? `Email: ${emailVal}` : null,
    })

    if (locErr) {
      flagged.push({ rowIndex: i, label: locName, reason: `DB error: ${locErr.message}` })
      continue
    }
    existingLocSet.add(dupKey)

    // Update group with non-empty values only
    const orgNpiRaw = cv(row, C.orgNpi)
    const firstNpi = orgNpiRaw ? (parseMultiValue(orgNpiRaw)[0]?.[0] ?? '') : ''
    const upd: Record<string, string> = {}
    if (cv(row, C.taxId))       upd.tax_id = cv(row, C.taxId)
    if (cv(row, C.legalName))   upd.legal_name = cv(row, C.legalName)
    if (cv(row, C.dba))         upd.name = cv(row, C.dba)
    if (cv(row, C.credName))    upd.credentialing_contact_name = cv(row, C.credName)
    if (cv(row, C.credPhone))   upd.credentialing_contact_phone = cv(row, C.credPhone)
    if (cv(row, C.credFax))     upd.credentialing_contact_fax = cv(row, C.credFax)
    if (cv(row, C.credEmail))   upd.credentialing_contact_email = cv(row, C.credEmail)
    if (firstNpi)               upd.group_npi = firstNpi
    if (cv(row, C.orgTaxonomy)) upd.taxonomy_code = cv(row, C.orgTaxonomy)
    if (Object.keys(upd).length > 0) await supabase.from('groups').update(upd).eq('id', group.id)

    imported++
  }

  onProgress(100)
  return { imported, skipped, flagged }
}

// ── Provider identifiers helper ────────────────────────────────────────────────
async function insertIdentifiers(
  orgId: string,
  providerId: string,
  raw: string,
  type: string,
  hasState: boolean,
  hasExpiry: boolean,
) {
  if (!raw.trim()) return
  const toIns: Record<string, unknown>[] = []
  let isPrimary = true
  for (const parts of parseMultiValue(raw)) {
    if (hasState) {
      const value = parts[1] ?? ''
      if (!value) continue
      toIns.push({
        organization_id: orgId, provider_id: providerId,
        identifier_type: type,
        state: parts[0] || null,
        identifier_value: value,
        expiration_date: hasExpiry ? normalizeDate(parts[2] ?? '') : null,
        is_primary: isPrimary,
      })
    } else {
      const value = parts[0] ?? ''
      if (!value) continue
      toIns.push({
        organization_id: orgId, provider_id: providerId,
        identifier_type: type, state: null,
        identifier_value: value, expiration_date: null,
        is_primary: isPrimary,
      })
    }
    isPrimary = false
  }
  if (toIns.length > 0) await supabase.from('provider_identifiers').insert(toIns)
}

// ── Providers import logic ─────────────────────────────────────────────────────
async function importProviders(
  orgId: string,
  headers: string[],
  rows: string[][],
  onProgress: (p: number) => void,
): Promise<MtResult> {
  const C = {
    firstName:   ci(headers, 'first name'),
    lastName:    ci(headers, 'last name'),
    middleName:  ci(headers, 'middle name'),
    npi:         ci(headers, 'npi'),
    ssn:         ci(headers, 'ssn'),
    dob:         ci(headers, 'date of birth'),
    gender:      ci(headers, 'gender identity'),
    languages:   ci(headers, 'languages'),
    email:       ci(headers, 'primary provider email'),
    phone:       ci(headers, 'work phone'),
    fax:         ci(headers, 'fax number'),
    division:    ci(headers, 'division'),
    primaryLoc:  ci(headers, 'primary location'),
    locations:   ci(headers, 'locations'),
    licenses:    ci(headers, 'professional licenses'),
    deas:        ci(headers, 'deas'),
    cdss:        ci(headers, 'cdss'),
    medicaid:    ci(headers, 'medicaid'),
    medicare:    ci(headers, 'medicare'),
    upin:        ci(headers, 'upin'),
    ecfmg:       ci(headers, 'ecfmg'),
    usmle:       ci(headers, 'usmle'),
    specialties: ci(headers, 'specialties'),
    education:   ci(headers, 'education'),
    training:    ci(headers, 'professional training'),
  }

  const [{ data: groupsData }, { data: locsData }, { data: existNpiData }] = await Promise.all([
    supabase.from('groups').select('id, division_code').eq('organization_id', orgId),
    supabase.from('locations').select('id, group_id').eq('organization_id', orgId),
    supabase.from('providers').select('npi').eq('organization_id', orgId).not('npi', 'is', null),
  ])

  const groupByDiv = new Map<string, string>()
  for (const g of (groupsData ?? []) as { id: string; division_code: string | null }[]) {
    if (g.division_code) groupByDiv.set(g.division_code.toLowerCase(), g.id)
  }

  const locsByGroup = new Map<string, string[]>()
  for (const l of (locsData ?? []) as { id: string; group_id: string | null }[]) {
    if (!l.group_id) continue
    if (!locsByGroup.has(l.group_id)) locsByGroup.set(l.group_id, [])
    locsByGroup.get(l.group_id)!.push(l.id)
  }

  const npiSet = new Set<string>((existNpiData ?? []).map(p => (p as { npi: string }).npi))

  let imported = 0, skipped = 0
  const flagged: FlaggedRow[] = []

  for (let i = 0; i < rows.length; i++) {
    onProgress(Math.round((i / rows.length) * 100))
    const row = rows[i]
    const firstName = cv(row, C.firstName)
    const lastName  = cv(row, C.lastName)
    const npi       = cv(row, C.npi)
    const label     = [lastName, firstName].filter(Boolean).join(', ') || `Row ${i + 2}`

    if (!firstName || !lastName || !npi) {
      const missing = ([!firstName && 'first name', !lastName && 'last name', !npi && 'NPI'] as (string | false)[]).filter(Boolean)
      flagged.push({ rowIndex: i, label, reason: `Missing required: ${missing.join(', ')}` })
      continue
    }
    if (npiSet.has(npi)) { skipped++; continue }

    // Parse specialties: first multi-value line → [specialty, taxonomy_code]
    const specParts = parseMultiValue(cv(row, C.specialties))[0] ?? []

    // Parse education: first line, extract 4-digit year
    const eduParts = parseMultiValue(cv(row, C.education))[0] ?? []
    const medSchool = eduParts[0] || null
    const gradYear = eduParts.map(p => parseInt(p)).find(n => n >= 1950 && n <= 2100) ?? null

    // Parse training: first line, extract 4-digit year
    const trainParts = parseMultiValue(cv(row, C.training))[0] ?? []
    const residProg = trainParts[0] || null
    const residComp = trainParts.map(p => parseInt(p)).find(n => n >= 1950 && n <= 2100) ?? null

    // Languages: join all first-parts with comma
    const langLines = parseMultiValue(cv(row, C.languages))
    const languages = langLines.length > 0 ? langLines.map(p => p[0]).filter(Boolean).join(', ') : null

    const { data: newProv, error: provErr } = await supabase
      .from('providers')
      .insert({
        organization_id:      orgId,
        first_name:           firstName,
        last_name:            lastName,
        middle_name:          cv(row, C.middleName) || null,
        npi,
        ssn:                  cv(row, C.ssn) || null,
        date_of_birth:        normalizeDate(cv(row, C.dob)),
        gender:               cv(row, C.gender) || null,
        languages,
        email:                cv(row, C.email) || null,
        phone:                cv(row, C.phone) || null,
        specialty:            specParts[0] || null,
        taxonomy_code:        specParts[1] || null,
        medical_school:       medSchool,
        graduation_year:      gradYear,
        residency_program:    residProg,
        residency_completion: residComp,
      })
      .select('id')
      .single()

    if (provErr || !newProv) {
      flagged.push({ rowIndex: i, label, reason: `DB error: ${provErr?.message ?? 'unknown'}` })
      continue
    }
    npiSet.add(npi)
    const pid = (newProv as { id: string }).id

    // Licenses: state | number | type | expiration | status
    const licRaw = cv(row, C.licenses)
    if (licRaw) {
      const licIns: Record<string, unknown>[] = []
      let isPrimary = true
      for (const parts of parseMultiValue(licRaw)) {
        const state = parts[0]; const licNum = parts[1]
        if (!state || !licNum) continue
        licIns.push({
          organization_id: orgId, provider_id: pid,
          state, license_number: licNum,
          license_type:    parts[2] || 'Unknown',
          status:          parts[4] || 'Active',
          expiration_date: normalizeDate(parts[3] ?? ''),
          is_primary:      isPrimary,
        })
        isPrimary = false
      }
      if (licIns.length > 0) await supabase.from('provider_licenses').insert(licIns)
    }

    // Identifiers
    await insertIdentifiers(orgId, pid, cv(row, C.deas),     'dea',      true,  true)
    await insertIdentifiers(orgId, pid, cv(row, C.cdss),     'cds',      true,  true)
    await insertIdentifiers(orgId, pid, cv(row, C.medicaid), 'medicaid', true,  false)
    await insertIdentifiers(orgId, pid, cv(row, C.medicare), 'medicare', true,  false)
    await insertIdentifiers(orgId, pid, cv(row, C.upin),     'upin',     false, false)
    await insertIdentifiers(orgId, pid, cv(row, C.ecfmg),    'ecfmg',    false, false)
    await insertIdentifiers(orgId, pid, cv(row, C.usmle),    'usmle',    false, false)

    // Location assignments
    const primaryLocVal = cv(row, C.primaryLoc).toLowerCase()
    const divisionVal   = cv(row, C.division).toLowerCase()
    const locsRaw       = cv(row, C.locations)

    // Collect division codes to assign: from Locations column (state|division per line)
    const assignDivs: string[] = []
    if (locsRaw) {
      for (const parts of parseMultiValue(locsRaw)) {
        const divCode = (parts[1] || parts[0] || '').toLowerCase()
        if (divCode) assignDivs.push(divCode)
      }
    }
    if (assignDivs.length === 0 && divisionVal) assignDivs.push(divisionVal)

    for (const divCode of assignDivs) {
      const groupId = groupByDiv.get(divCode)
      if (!groupId) {
        flagged.push({ rowIndex: i, label, reason: `Location division "${divCode}" not found — provider imported without this location link` })
        continue
      }
      const locIds = locsByGroup.get(groupId) ?? []
      if (locIds.length === 0) continue
      const isPrimaryDiv = divCode === primaryLocVal || (assignDivs.length === 1 && divCode === divisionVal)
      for (let li = 0; li < locIds.length; li++) {
        await supabase.from('provider_group_locations').insert({
          organization_id: orgId,
          provider_id:     pid,
          group_id:        groupId,
          location_id:     locIds[li],
          is_primary:      isPrimaryDiv && li === 0,
          is_active:       true,
        })
      }
    }

    imported++
  }

  onProgress(100)
  return { imported, skipped, flagged }
}

// ── Shared UI components ───────────────────────────────────────────────────────
function DropZone({ onFile, dragOver, setDragOver }: {
  onFile: (f: File) => void
  dragOver: boolean
  setDragOver: (v: boolean) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${dragOver ? '#4f46e5' : '#cbd5e1'}`,
        borderRadius: '16px', padding: '72px 24px', textAlign: 'center',
        cursor: 'pointer', backgroundColor: dragOver ? '#eef2ff' : '#f8fafc',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: '44px', marginBottom: '16px' }}>📂</div>
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
        Drop your .xlsx file here, or click to browse
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
        MedTrainer Excel export (.xlsx only)
      </div>
      <button className="btn btn-primary" onClick={e => { e.stopPropagation(); ref.current?.click() }}>
        Choose File
      </button>
      <input ref={ref} type="file" accept=".xlsx" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="card-lg" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
          File preview — first 3 rows · {headers.length} columns detected
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 3).map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {row.map((cell, ci2) => (
                  <td key={ci2} style={{ padding: '8px 12px', color: '#475569', whiteSpace: 'nowrap', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cell || <span style={{ color: '#e2e8f0' }}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ResultCards({ result }: { result: MtResult }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
      {[
        { count: result.imported,        label: 'Imported',              color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', active: result.imported > 0 },
        { count: result.skipped,         label: 'Skipped (duplicates)',  color: '#b45309', bg: '#fffbeb', border: '#fde68a', active: result.skipped > 0 },
        { count: result.flagged.length,  label: 'Flagged for review',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca', active: result.flagged.length > 0 },
      ].map(({ count, label, color, bg, border, active }) => (
        <div key={label} style={{ padding: '16px', borderRadius: '10px', backgroundColor: active ? bg : '#f8fafc', border: `1px solid ${active ? border : '#e2e8f0'}` }}>
          <div style={{ fontSize: '26px', fontWeight: 700, color: active ? color : '#94a3b8' }}>{count}</div>
          <div style={{ fontSize: '12px', fontWeight: 500, color: active ? color : '#94a3b8', marginTop: '2px' }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function FlagQueue({ flags }: { flags: FlaggedRow[] }) {
  if (flags.length === 0) return null
  return (
    <div className="card-lg" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
      <div style={{ padding: '10px 16px', backgroundColor: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b91c1c' }}>
          {flags.length} flagged for review
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              {['Row', 'Name', 'Reason'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, backgroundColor: '#fef9f9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {flags.map((f, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{f.rowIndex + 2}</td>
                <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>{f.label}</td>
                <td style={{ padding: '8px 12px', color: '#b91c1c' }}>{f.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="card-lg" style={{ textAlign: 'center', padding: '72px 24px' }}>
      <div style={{ fontSize: '44px', marginBottom: '20px' }}>⏳</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>{label}</div>
      <div style={{ maxWidth: '320px', margin: '0 auto', backgroundColor: '#f1f5f9', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', backgroundColor: '#4f46e5', borderRadius: '9999px', width: `${progress}%`, transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>{progress}%</div>
    </div>
  )
}

// ── Locations tab ──────────────────────────────────────────────────────────────
function LocationsTab({ orgId }: { orgId: string }) {
  const [step,     setStep]     = useState<MtStep>('idle')
  const [fileName, setFileName] = useState('')
  const [headers,  setHeaders]  = useState<string[]>([])
  const [rows,     setRows]     = useState<string[][]>([])
  const [result,   setResult]   = useState<MtResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) { setError('Please upload an .xlsx file.'); return }
    try {
      setError(null)
      const { headers: h, rows: r } = await parseXlsxFile(file)
      setFileName(file.name); setHeaders(h); setRows(r); setStep('previewing')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to parse file') }
  }, [])

  const handleImport = async () => {
    setStep('importing'); setProgress(0); setError(null)
    try {
      const res = await importLocations(orgId, headers, rows, setProgress)
      setResult(res); setStep('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); setStep('previewing') }
  }

  const reset = () => { setStep('idle'); setFileName(''); setHeaders([]); setRows([]); setResult(null); setError(null); setProgress(0) }

  if (step === 'idle') return (
    <>
      {error && <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>}
      <DropZone onFile={handleFile} dragOver={dragOver} setDragOver={setDragOver} />
    </>
  )

  if (step === 'previewing') return (
    <div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        <strong style={{ color: '#0f172a' }}>{fileName}</strong> — {rows.length} data rows
      </div>
      <PreviewTable headers={headers} rows={rows} />
      {error && <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={reset} className="btn btn-secondary">← Start over</button>
        <button onClick={handleImport} className="btn btn-primary">Import {rows.length} location{rows.length !== 1 ? 's' : ''} →</button>
      </div>
    </div>
  )

  if (step === 'importing') return <ProgressBar progress={progress} label="Importing locations…" />

  if (step === 'done' && result) return (
    <div>
      <ResultCards result={result} />
      <FlagQueue flags={result.flagged} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <Link href="/locations" className="btn btn-primary">View Locations →</Link>
        <button onClick={reset} className="btn btn-secondary">Import another file</button>
      </div>
    </div>
  )

  return null
}

// ── Providers tab ──────────────────────────────────────────────────────────────
function ProvidersTab({ orgId }: { orgId: string }) {
  const [step,     setStep]     = useState<MtStep>('idle')
  const [fileName, setFileName] = useState('')
  const [headers,  setHeaders]  = useState<string[]>([])
  const [rows,     setRows]     = useState<string[][]>([])
  const [result,   setResult]   = useState<MtResult | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.xlsx')) { setError('Please upload an .xlsx file.'); return }
    try {
      setError(null)
      const { headers: h, rows: r } = await parseXlsxFile(file)
      setFileName(file.name); setHeaders(h); setRows(r); setStep('previewing')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to parse file') }
  }, [])

  const handleImport = async () => {
    setStep('importing'); setProgress(0); setError(null)
    try {
      const res = await importProviders(orgId, headers, rows, setProgress)
      setResult(res); setStep('done')
    } catch (e) { setError(e instanceof Error ? e.message : 'Import failed'); setStep('previewing') }
  }

  const reset = () => { setStep('idle'); setFileName(''); setHeaders([]); setRows([]); setResult(null); setError(null); setProgress(0) }

  if (step === 'idle') return (
    <>
      <div style={{ marginBottom: '16px', padding: '10px 14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', fontSize: '12px', color: '#92400e' }}>
        Import locations first so providers can be linked to their practice sites.
      </div>
      {error && <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>}
      <DropZone onFile={handleFile} dragOver={dragOver} setDragOver={setDragOver} />
    </>
  )

  if (step === 'previewing') return (
    <div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
        <strong style={{ color: '#0f172a' }}>{fileName}</strong> — {rows.length} data rows
      </div>
      <PreviewTable headers={headers} rows={rows} />
      {error && <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={reset} className="btn btn-secondary">← Start over</button>
        <button onClick={handleImport} className="btn btn-primary">Import {rows.length} provider{rows.length !== 1 ? 's' : ''} →</button>
      </div>
    </div>
  )

  if (step === 'importing') return <ProgressBar progress={progress} label="Importing providers…" />

  if (step === 'done' && result) return (
    <div>
      <ResultCards result={result} />
      <FlagQueue flags={result.flagged} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <Link href="/providers" className="btn btn-primary">View Providers →</Link>
        <button onClick={reset} className="btn btn-secondary">Import another file</button>
      </div>
    </div>
  )

  return null
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function MtImportPage() {
  const orgId = useOrganizationId()
  const [activeTab, setActiveTab] = useState<'locations' | 'providers'>('locations')

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', fontSize: '13px', fontWeight: active ? 600 : 400,
    color: active ? '#4f46e5' : '#64748b',
    background: 'none', border: 'none',
    borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    cursor: 'pointer',
  })

  return (
    <main className="page-xl">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">MedTrainer Import</h1>
          <p className="page-subtitle">Import locations and providers from a MedTrainer Excel export</p>
        </div>
      </div>

      {/* Step order hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 14px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#64748b' }}>
        <span style={{ fontWeight: 600, color: activeTab === 'locations' ? '#4f46e5' : '#15803d' }}>Step 1: Locations</span>
        <span>→</span>
        <span style={{ fontWeight: 600, color: activeTab === 'providers' ? '#4f46e5' : '#94a3b8' }}>Step 2: Providers</span>
        <span style={{ marginLeft: 'auto' }}>Import locations before providers so assignments can be linked automatically.</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button style={tabStyle(activeTab === 'locations')} onClick={() => setActiveTab('locations')}>
          1 · Locations
        </button>
        <button style={tabStyle(activeTab === 'providers')} onClick={() => setActiveTab('providers')}>
          2 · Providers
        </button>
      </div>

      {orgId == null ? (
        <div style={{ color: '#94a3b8', fontSize: '13px' }}>Loading…</div>
      ) : activeTab === 'locations' ? (
        <LocationsTab orgId={orgId} />
      ) : (
        <ProvidersTab orgId={orgId} />
      )}
    </main>
  )
}
