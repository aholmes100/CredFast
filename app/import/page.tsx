'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useOrganizationId } from '../lib/use-organization-id'

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'mapping' | 'reviewing' | 'importing' | 'done'

interface FieldDef {
  key: string
  label: string
  type?: 'date' | 'boolean' | 'number'
}

interface RowValidation {
  rowIndex: number
  mapped: Record<string, string>
  errors: string[]
  warnings: string[]
}

interface ImportResult { imported: number; skipped: number }

// ── CredFast provider fields available for mapping ─────────────────────────────
const PROVIDER_FIELDS: FieldDef[] = [
  { key: 'first_name',              label: 'First Name' },
  { key: 'last_name',               label: 'Last Name' },
  { key: 'middle_name',             label: 'Middle Name' },
  { key: 'credential_suffix',       label: 'Credential Suffix (MD, DO…)' },
  { key: 'email',                   label: 'Email' },
  { key: 'phone',                   label: 'Phone' },
  { key: 'date_of_birth',           label: 'Date of Birth',            type: 'date' },
  { key: 'gender',                  label: 'Gender' },
  { key: 'npi',                     label: 'NPI' },
  { key: 'caqh_number',             label: 'CAQH Number' },
  { key: 'dea_number',              label: 'DEA Number' },
  { key: 'medicaid_number',         label: 'Medicaid Number' },
  { key: 'medicare_number',         label: 'Medicare PTAN' },
  { key: 'specialty',               label: 'Specialty' },
  { key: 'taxonomy_code',           label: 'Taxonomy Code' },
  { key: 'license_number',          label: 'License Number' },
  { key: 'license_state',           label: 'License State' },
  { key: 'license_expiration',      label: 'License Expiration',       type: 'date' },
  { key: 'malpractice_carrier',     label: 'Malpractice Carrier' },
  { key: 'malpractice_policy',      label: 'Malpractice Policy Number' },
  { key: 'malpractice_expiration',  label: 'Malpractice Expiration',   type: 'date' },
  { key: 'malpractice_per_occurrence', label: 'Malpractice Per Occurrence', type: 'number' },
  { key: 'malpractice_aggregate',   label: 'Malpractice Aggregate',    type: 'number' },
  { key: 'board_certified',         label: 'Board Certification',      type: 'boolean' },
  { key: 'board_expiration',        label: 'Board Expiration',         type: 'date' },
  { key: 'accepting_new_patients',  label: 'Accepting New Patients',   type: 'boolean' },
]

// ── Auto-map rules (CSV header → CredFast field key) ──────────────────────────
const AUTO_MAP: Record<string, string> = {
  'first name': 'first_name',       'firstname': 'first_name',        'first': 'first_name',
  'last name': 'last_name',         'lastname': 'last_name',          'last': 'last_name',
  'middle name': 'middle_name',     'middle': 'middle_name',          'mi': 'middle_name',
  'credentials': 'credential_suffix', 'suffix': 'credential_suffix', 'credential': 'credential_suffix',
  'credential suffix': 'credential_suffix', 'degree': 'credential_suffix',
  'email': 'email',                 'email address': 'email',         'work email': 'email',
  'phone': 'phone',                 'phone number': 'phone',          'work phone': 'phone',
  'mobile': 'phone',                'cell': 'phone',
  'dob': 'date_of_birth',           'date of birth': 'date_of_birth', 'birth date': 'date_of_birth',
  'birthdate': 'date_of_birth',
  'gender': 'gender',               'sex': 'gender',
  'npi': 'npi',                     'npi number': 'npi',              'national provider id': 'npi', 'npi#': 'npi',
  'caqh': 'caqh_number',            'caqh number': 'caqh_number',     'caqh id': 'caqh_number',      'caqh #': 'caqh_number',
  'dea': 'dea_number',              'dea number': 'dea_number',       'dea #': 'dea_number',
  'medicaid': 'medicaid_number',    'medicaid number': 'medicaid_number', 'medicaid id': 'medicaid_number',
  'medicare': 'medicare_number',    'medicare ptan': 'medicare_number', 'ptan': 'medicare_number',
  'specialty': 'specialty',         'primary specialty': 'specialty',  'spec': 'specialty',
  'taxonomy': 'taxonomy_code',      'taxonomy code': 'taxonomy_code',
  'license number': 'license_number', 'license #': 'license_number',  'license no': 'license_number', 'lic #': 'license_number',
  'license state': 'license_state', 'license st': 'license_state',    'lic state': 'license_state',
  'license expiration': 'license_expiration', 'license exp': 'license_expiration',
  'license exp date': 'license_expiration',   'lic exp': 'license_expiration',
  'malpractice carrier': 'malpractice_carrier', 'mal carrier': 'malpractice_carrier',
  'insurance carrier': 'malpractice_carrier',   'ins carrier': 'malpractice_carrier',
  'malpractice policy': 'malpractice_policy',   'policy number': 'malpractice_policy',
  'policy #': 'malpractice_policy',             'policy no': 'malpractice_policy',
  'malpractice expiration': 'malpractice_expiration', 'mal exp': 'malpractice_expiration',
  'insurance exp': 'malpractice_expiration',    'ins exp': 'malpractice_expiration',
  'board certified': 'board_certified',         'board certification': 'board_certified',
  'board expiration': 'board_expiration',       'board exp': 'board_expiration',
  'accepting new patients': 'accepting_new_patients', 'panel status': 'accepting_new_patients',
  'panel': 'accepting_new_patients',
}

// ── CSV parser — handles quoted fields and embedded commas ─────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(field); field = '' }
      else if (ch === '\n') {
        row.push(field); field = ''
        if (row.some(f => f.trim())) rows.push(row)
        row = []
      } else if (ch !== '\r') { field += ch }
    }
  }
  row.push(field)
  if (row.some(f => f.trim())) rows.push(row)
  return rows
}

// ── Value normalizers ──────────────────────────────────────────────────────────
function normalizeDate(val: string): string | null {
  const v = val.trim()
  if (!v) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  const mdy = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  return null
}

function normalizeBool(val: string): boolean | null {
  const v = val.toLowerCase().trim()
  if (['yes', 'true', '1', 'y', 'x', 'active', 'open'].includes(v)) return true
  if (['no', 'false', '0', 'n', 'closed', 'inactive', ''].includes(v)) return false
  return null
}

function normalizeNumber(val: string): number | null {
  const n = parseFloat(val.replace(/[$,]/g, '').trim())
  return isNaN(n) ? null : n
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ImportPage() {
  const orgId  = useOrganizationId()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step,          setStep]          = useState<Step>('idle')
  const [fileName,      setFileName]      = useState('')
  const [headers,       setHeaders]       = useState<string[]>([])
  const [rows,          setRows]          = useState<string[][]>([])
  const [mapping,       setMapping]       = useState<Record<number, string>>({})
  const [validations,   setValidations]   = useState<RowValidation[]>([])
  const [skipDups,      setSkipDups]      = useState(true)
  const [progress,      setProgress]      = useState(0)
  const [result,        setResult]        = useState<ImportResult | null>(null)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [dragOver,      setDragOver]      = useState(false)

  // ── File processing ──────────────────────────────────────────────────────────
  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text = (e.target?.result as string) ?? ''
      const parsed = parseCSV(text)
      if (parsed.length < 2) return
      const [headerRow, ...dataRows] = parsed
      setHeaders(headerRow)
      setRows(dataRows)
      const autoMapped: Record<number, string> = {}
      headerRow.forEach((h, i) => {
        const match = AUTO_MAP[h.toLowerCase().trim()]
        if (match) autoMapped[i] = match
      })
      setMapping(autoMapped)
      setStep('mapping')
    }
    reader.readAsText(file)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  // ── Column mapping ───────────────────────────────────────────────────────────
  const setColMapping = (colIndex: number, fieldKey: string) => {
    setMapping(prev => {
      const next = { ...prev }
      if (!fieldKey) { delete next[colIndex]; return next }
      // Remove this field from any other column that already has it
      Object.keys(next).forEach(k => { if (next[+k] === fieldKey) delete next[+k] })
      next[colIndex] = fieldKey
      return next
    })
  }

  // ── Build validated rows ─────────────────────────────────────────────────────
  const buildValidations = useCallback((): RowValidation[] => {
    const built = rows.map((row, rowIndex) => {
      const mapped: Record<string, string> = {}
      Object.entries(mapping).forEach(([ci, fk]) => { mapped[fk] = row[+ci]?.trim() ?? '' })
      const errors: string[]   = []
      const warnings: string[] = []
      if (!mapped.first_name?.trim()) errors.push('Missing first name')
      if (!mapped.last_name?.trim())  errors.push('Missing last name')
      if (!mapped.npi?.trim())        warnings.push('NPI not provided')
      return { rowIndex, mapped, errors, warnings }
    })
    // Detect duplicate NPIs within file
    const npiSeen = new Map<string, number>()
    built.forEach(r => {
      const npi = r.mapped.npi?.trim()
      if (!npi) return
      if (npiSeen.has(npi)) {
        r.warnings.push(`Duplicate NPI — same as row ${(npiSeen.get(npi) ?? 0) + 1}`)
      } else {
        npiSeen.set(npi, r.rowIndex)
      }
    })
    return built
  }, [rows, mapping])

  const handleProceedToReview = () => {
    setValidations(buildValidations())
    setStep('reviewing')
  }

  // ── Import ───────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!orgId) return
    setStep('importing'); setProgress(0); setImportError(null)

    const npiSeen = new Set<string>()
    const toInsert: Record<string, unknown>[] = []
    let skipped = 0

    for (const v of validations) {
      if (v.errors.length > 0) { skipped++; continue }
      const npi = v.mapped.npi?.trim()
      if (skipDups && npi && npiSeen.has(npi)) { skipped++; continue }
      if (npi) npiSeen.add(npi)

      const record: Record<string, unknown> = { organization_id: orgId }
      for (const field of PROVIDER_FIELDS) {
        const raw = v.mapped[field.key]?.trim()
        if (!raw) continue
        if      (field.type === 'date')    { const d = normalizeDate(raw);    if (d !== null) record[field.key] = d }
        else if (field.type === 'boolean') { const b = normalizeBool(raw);    if (b !== null) record[field.key] = b }
        else if (field.type === 'number')  { const n = normalizeNumber(raw);  if (n !== null) record[field.key] = n }
        else                               { record[field.key] = raw }
      }
      toInsert.push(record)
    }

    let imported = 0
    const BATCH = 50
    try {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const { error } = await supabase.from('providers').insert(toInsert.slice(i, i + BATCH))
        if (error) throw new Error(error.message)
        imported += Math.min(BATCH, toInsert.length - i)
        setProgress(Math.round(imported / toInsert.length * 100))
      }
      setResult({ imported, skipped })
      setStep('done')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
      setStep('reviewing')
    }
  }

  const reset = () => {
    setStep('idle'); setFileName(''); setHeaders([]); setRows([])
    setMapping({}); setValidations([]); setProgress(0); setResult(null); setImportError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const errorRows   = validations.filter(v => v.errors.length > 0)
  const warningRows = validations.filter(v => v.errors.length === 0 && v.warnings.length > 0)
  const validRows   = validations.filter(v => v.errors.length === 0)
  const dupRows     = validations.filter(v => v.warnings.some(w => w.startsWith('Duplicate NPI')))
  const importCount = validRows.length - (skipDups ? dupRows.length : 0)
  const canProceed  = Object.values(mapping).includes('first_name') && Object.values(mapping).includes('last_name')
  const previewCols = PROVIDER_FIELDS.filter(f => Object.values(mapping).includes(f.key))

  // ── Styles ───────────────────────────────────────────────────────────────────
  const pill = (active: boolean, activeColor: string, activeBg: string) => ({
    fontSize: '12px', fontWeight: 600,
    color: active ? activeColor : '#94a3b8',
    padding: '4px 12px', borderRadius: '9999px',
    backgroundColor: active ? activeBg : 'transparent',
    border: `1px solid ${active ? activeColor : '#e2e8f0'}`,
  })

  return (
    <main className="page-xl">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Import Providers</h1>
          <p className="page-subtitle">Import provider data from a MedTrainer export or any CSV spreadsheet</p>
        </div>
        {step !== 'idle' && step !== 'importing' && step !== 'done' && (
          <button onClick={reset} className="btn btn-secondary">Start over</button>
        )}
      </div>

      {/* Step indicator */}
      {(step === 'mapping' || step === 'reviewing' || step === 'importing') && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px' }}>
          <span style={pill(step === 'mapping', '#4f46e5', '#eef2ff')}>1 · Upload &amp; Map</span>
          <span style={{ color: '#cbd5e1' }}>→</span>
          <span style={pill(step === 'reviewing' || step === 'importing', '#4f46e5', '#eef2ff')}>2 · Review &amp; Import</span>
        </div>
      )}

      {/* ── IDLE: drop zone ─────────────────────────────────────────────────── */}
      {step === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? '#4f46e5' : '#cbd5e1'}`,
            borderRadius: '16px', padding: '72px 24px', textAlign: 'center',
            cursor: 'pointer', backgroundColor: dragOver ? '#eef2ff' : '#f8fafc',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>📂</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Drop your CSV file here, or click to browse
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
            Accepts CSV exports from MedTrainer, Excel, or any credentialing system
          </div>
          <button
            className="btn btn-primary"
            onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
          >
            Choose CSV File
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileInput} />
        </div>
      )}

      {/* ── MAPPING ─────────────────────────────────────────────────────────── */}
      {step === 'mapping' && (
        <div>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            <strong style={{ color: '#0f172a' }}>{fileName}</strong> — {rows.length} data rows, {headers.length} columns
          </div>

          {/* CSV preview */}
          <div className="card-lg" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                CSV Preview — first 3 rows
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
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '8px 12px', color: '#475569', whiteSpace: 'nowrap', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cell || <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column mapper */}
          <div className="card-lg" style={{ marginBottom: '20px' }}>
            <p className="section-label" style={{ marginBottom: '4px' }}>Map Columns to CredFast Fields</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
              Columns that matched automatically are pre-mapped. Adjust any that are incorrect.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Header row */}
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 240px', gap: '12px', padding: '6px 0 8px', borderBottom: '1px solid #e2e8f0', marginBottom: '4px' }}>
                {['CSV Column', 'Sample Data', 'Maps To'].map(h => (
                  <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{h}</span>
                ))}
              </div>
              {headers.map((header, i) => {
                const sample = rows.slice(0, 3).map(r => r[i]?.trim()).filter(Boolean).slice(0, 3).join(', ')
                const isMapped = !!mapping[i]
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '220px 1fr 240px', gap: '12px',
                    alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9',
                  }}>
                    <div style={{
                      fontSize: '13px', fontWeight: 500,
                      color: isMapped ? '#0f172a' : '#64748b',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {header}
                      {isMapped && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#16a34a' }}>✓</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sample || '—'}
                    </div>
                    <select
                      className="form-select"
                      value={mapping[i] ?? ''}
                      onChange={e => setColMapping(i, e.target.value)}
                      style={{ fontSize: '12px' }}
                    >
                      <option value="">— Ignore this column —</option>
                      {PROVIDER_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {!canProceed ? (
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Map First Name and Last Name to continue.</span>
            ) : (
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {Object.keys(mapping).length} column{Object.keys(mapping).length !== 1 ? 's' : ''} mapped
              </span>
            )}
            <button onClick={handleProceedToReview} disabled={!canProceed} className="btn btn-primary">
              Review Import →
            </button>
          </div>
        </div>
      )}

      {/* ── REVIEWING ───────────────────────────────────────────────────────── */}
      {step === 'reviewing' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { count: validRows.length, label: 'Ready to import', active: validRows.length > 0, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
              { count: warningRows.length, label: 'Warnings (will import)', active: warningRows.length > 0, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
              { count: errorRows.length,  label: 'Errors (will be skipped)', active: errorRows.length > 0, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            ].map(({ count, label, active, color, bg, border }) => (
              <div key={label} style={{ padding: '16px', borderRadius: '10px', backgroundColor: active ? bg : '#f8fafc', border: `1px solid ${active ? border : '#e2e8f0'}` }}>
                <div style={{ fontSize: '26px', fontWeight: 700, color: active ? color : '#94a3b8' }}>{count}</div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: active ? color : '#94a3b8', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Duplicate NPI option */}
          {dupRows.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#92400e' }}>
                <input type="checkbox" checked={skipDups} onChange={e => setSkipDups(e.target.checked)} />
                <span>
                  <strong>{dupRows.length} row{dupRows.length !== 1 ? 's' : ''} have duplicate NPIs</strong> — skip duplicates and keep first occurrence only
                </span>
              </label>
            </div>
          )}

          {/* Error details */}
          {errorRows.length > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#b91c1c', marginBottom: '6px' }}>Rows that will be skipped:</div>
              {errorRows.slice(0, 5).map(r => (
                <div key={r.rowIndex} style={{ fontSize: '12px', color: '#b91c1c', marginBottom: '2px' }}>
                  Row {r.rowIndex + 1}: {r.errors.join(', ')}
                </div>
              ))}
              {errorRows.length > 5 && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>…and {errorRows.length - 5} more</div>}
            </div>
          )}

          {/* Preview table */}
          <div className="card-lg" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '10px 16px', backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                Preview — first 10 rows
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>#</th>
                    {previewCols.map(f => (
                      <th key={f.key} style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', backgroundColor: '#f8fafc' }}>
                        {f.label}
                      </th>
                    ))}
                    <th style={{ padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600, backgroundColor: '#f8fafc' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {validations.slice(0, 10).map(v => (
                    <tr key={v.rowIndex} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: v.errors.length > 0 ? '#fff8f8' : 'transparent' }}>
                      <td style={{ padding: '8px 10px', color: '#94a3b8', fontSize: '11px' }}>{v.rowIndex + 1}</td>
                      {previewCols.map(f => (
                        <td key={f.key} style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.mapped[f.key] || <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                        {v.errors.length > 0
                          ? <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>⚠ {v.errors[0]}</span>
                          : v.warnings.length > 0
                            ? <span style={{ fontSize: '11px', color: '#b45309' }}>⚠ {v.warnings[0]}</span>
                            : <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 500 }}>✓ Ready</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {importError && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c' }}>
              {importError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setStep('mapping')} className="btn btn-secondary">← Back to mapping</button>
            <button onClick={handleImport} disabled={importCount === 0 || !orgId} className="btn btn-primary">
              Import {importCount} Provider{importCount !== 1 ? 's' : ''} →
            </button>
          </div>
        </div>
      )}

      {/* ── IMPORTING ───────────────────────────────────────────────────────── */}
      {step === 'importing' && (
        <div className="card-lg" style={{ textAlign: 'center', padding: '72px 24px' }}>
          <div style={{ fontSize: '44px', marginBottom: '20px' }}>⏳</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '20px' }}>Importing providers…</div>
          <div style={{ maxWidth: '320px', margin: '0 auto', backgroundColor: '#f1f5f9', borderRadius: '9999px', height: '8px', overflow: 'hidden' }}>
            <div style={{ height: '100%', backgroundColor: '#4f46e5', borderRadius: '9999px', width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>{progress}%</div>
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────────── */}
      {step === 'done' && result && (
        <div className="card-lg" style={{ textAlign: 'center', padding: '72px 24px' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>✅</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Import complete</div>
          <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '28px' }}>
            Successfully imported{' '}
            <strong style={{ color: '#15803d' }}>{result.imported} provider{result.imported !== 1 ? 's' : ''}</strong>
            {result.skipped > 0 && <> · <strong style={{ color: '#b45309' }}>{result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped</strong></>}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <Link href="/providers" className="btn btn-primary">View Providers →</Link>
            <button onClick={reset} className="btn btn-secondary">Import another file</button>
          </div>
        </div>
      )}
    </main>
  )
}
