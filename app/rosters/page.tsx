'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useOrganizationId } from '../lib/use-organization-id'
import type { RosterTemplateWithPayer } from '../types'

// ── CredFast fields available for mapping ──────────────────────────────────────

interface RosterFieldDef {
  key: string
  label: string
}

const ROSTER_FIELDS: RosterFieldDef[] = [
  { key: 'first_name',              label: 'First Name' },
  { key: 'middle_name',             label: 'Middle Name' },
  { key: 'last_name',               label: 'Last Name' },
  { key: 'credential_suffix',       label: 'Credential Suffix' },
  { key: 'npi',                     label: 'NPI' },
  { key: 'caqh_number',             label: 'CAQH ID' },
  { key: 'dea_number',              label: 'DEA Number' },
  { key: 'tax_id',                  label: 'Tax ID (Group)' },
  { key: 'specialty',               label: 'Specialty' },
  { key: 'taxonomy_code',           label: 'Taxonomy Code' },
  { key: 'gender',                  label: 'Gender' },
  { key: 'license_number',          label: 'License Number' },
  { key: 'license_state',           label: 'License State' },
  { key: 'service_address',         label: 'Service Address' },
  { key: 'service_address_2',       label: 'Service Address 2' },
  { key: 'service_city',            label: 'Service City' },
  { key: 'service_state',           label: 'Service State' },
  { key: 'service_zip',             label: 'Service ZIP' },
  { key: 'service_phone',           label: 'Service Phone' },
  { key: 'service_fax',             label: 'Service Fax' },
  { key: 'billing_address',         label: 'Billing Address' },
  { key: 'billing_address_2',       label: 'Billing Address 2' },
  { key: 'billing_city',            label: 'Billing City' },
  { key: 'billing_state',           label: 'Billing State' },
  { key: 'billing_zip',             label: 'Billing ZIP' },
  { key: 'billing_phone',           label: 'Billing Phone' },
  { key: 'group_name',              label: 'Group / Practice Name' },
  { key: 'group_npi',               label: 'Group NPI' },
  { key: 'accepting_new_patients',  label: 'Accepting New Patients' },
  { key: 'date_of_birth',           label: 'Date of Birth' },
  { key: 'network_effective_date',  label: 'Network Effective Date (leave blank)' },
  { key: 'pcp_or_specialist',       label: 'PCP or Specialist (leave blank)' },
]

// ── Auto-map rules (Humana column headers → CredFast field keys) ───────────────

const ROSTER_AUTO_MAP: Record<string, string> = {
  'practitioner first name':                'first_name',
  'practitioner middle name':               'middle_name',
  'practitioner last name':                 'last_name',
  'title':                                  'credential_suffix',
  'npi':                                    'npi',
  'caqh id (required for individuals)':     'caqh_number',
  'tax id':                                 'tax_id',
  'specialty':                              'specialty',
  'taxonomy code':                          'taxonomy_code',
  'gender':                                 'gender',
  'service address 2':                      'service_address_2',
  'service address city':                   'service_city',
  'service address state':                  'service_state',
  'service address zip code':               'service_zip',
  'service phone number':                   'service_phone',
  'service fax number':                     'service_fax',
  'remit street address 2':                 'billing_address_2',
  'remit address city':                     'billing_city',
  'remit address state':                    'billing_state',
  'remit address zip code':                 'billing_zip',
  'remit address phone #':                  'billing_phone',
  'group/practice name':                    'group_name',
  'group/practice npi':                     'group_npi',
  'accepting new patients?':                'accepting_new_patients',
  'birth date':                             'date_of_birth',
}

function autoMapHeader(header: string): string | null {
  const lower = header.trim().toLowerCase()

  const exact = ROSTER_AUTO_MAP[lower]
  if (exact) return exact

  // "Service Address" containing match (excludes more-specific columns)
  if (
    lower.includes('service address') &&
    !lower.includes('2') &&
    !lower.includes('city') &&
    !lower.includes('state') &&
    !lower.includes('zip') &&
    !lower.includes('phone') &&
    !lower.includes('fax')
  ) return 'service_address'

  // "Remit Street Address" (not Address 2)
  if (
    lower.includes('remit') &&
    lower.includes('address') &&
    !lower.includes('2') &&
    !lower.includes('city') &&
    !lower.includes('state') &&
    !lower.includes('zip') &&
    !lower.includes('phone')
  ) return 'billing_address'

  return null
}

function parseSheetHeaders(wb: XLSX.WorkBook, sheetName: string): string[] {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const data = XLSX.utils.sheet_to_json<(string | undefined | null)[]>(ws, { header: 1 })
  const headerRow = (data[0] as (string | undefined | null)[]) ?? []
  return headerRow.map(h => h?.toString() ?? '').filter(h => h.trim())
}

// ── Types ──────────────────────────────────────────────────────────────────────

type PageMode = 'list' | 'upload'
type UploadStep = 1 | 2

interface PayerOption {
  id: string
  name: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function RostersPage() {
  const orgId = useOrganizationId()
  const fileRef = useRef<HTMLInputElement>(null)

  // List state
  const [templates, setTemplates]   = useState<RosterTemplateWithPayer[]>([])
  const [payers, setPayers]         = useState<PayerOption[]>([])
  const [loading, setLoading]       = useState(true)
  const [deleteId, setDeleteId]     = useState<string | null>(null)

  // Upload/edit state
  const [mode, setMode]                     = useState<PageMode>('list')
  const [uploadStep, setUploadStep]         = useState<UploadStep>(1)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [loadingEdit, setLoadingEdit]       = useState(false)

  const [file, setFile]               = useState<File | null>(null)
  const [workbook, setWorkbook]       = useState<XLSX.WorkBook | null>(null)
  const [sheetNames, setSheetNames]   = useState<string[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [templateName, setTemplateName] = useState<string>('')
  const [selectedPayerId, setSelectedPayerId] = useState<string>('')
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('roster_templates')
      .select('*, payers(name)')
      .order('created_at', { ascending: false })
    setTemplates((data ?? []) as unknown as RosterTemplateWithPayer[])
  }, [])

  const fetchPayers = useCallback(async () => {
    const { data } = await supabase
      .from('payers')
      .select('id, name')
      .order('name')
    setPayers((data ?? []) as PayerOption[])
  }, [])

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchPayers()]).finally(() => setLoading(false))
  }, [fetchTemplates, fetchPayers])

  // ── Upload flow ──────────────────────────────────────────────────────────────

  const applySheetHeaders = useCallback((wb: XLSX.WorkBook, sheetName: string) => {
    const headers = parseSheetHeaders(wb, sheetName)
    setDetectedHeaders(headers)
    const mapped: Record<string, string> = {}
    headers.forEach(h => {
      const match = autoMapHeader(h)
      if (match) mapped[h] = match
    })
    setColumnMappings(mapped)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    if (!templateName) setTemplateName(f.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result
      if (!data) return
      const wb = XLSX.read(data, { type: 'array' })
      setWorkbook(wb)
      setSheetNames(wb.SheetNames)
      const defaultSheet = wb.SheetNames.includes('PractitionerFacility Add_Update')
        ? 'PractitionerFacility Add_Update'
        : wb.SheetNames[0]
      setSelectedSheet(defaultSheet)
      applySheetHeaders(wb, defaultSheet)
    }
    reader.readAsArrayBuffer(f)
  }

  const handleSheetChange = (sheet: string) => {
    setSelectedSheet(sheet)
    if (workbook) applySheetHeaders(workbook, sheet)
  }

  const setMapping = (header: string, fieldKey: string) => {
    setColumnMappings(prev => {
      const next = { ...prev }
      if (!fieldKey) { delete next[header]; return next }
      Object.keys(next).forEach(k => { if (next[k] === fieldKey) delete next[k] })
      next[header] = fieldKey
      return next
    })
  }

  // ── Edit mapping ─────────────────────────────────────────────────────────────

  const handleEditMapping = async (template: RosterTemplateWithPayer) => {
    setLoadingEdit(true)
    setEditingTemplateId(template.id)
    setTemplateName(template.name)
    setSelectedPayerId(template.payer_id ?? '')

    try {
      const { data: urlData } = await supabase.storage
        .from('rosters')
        .createSignedUrl(template.file_path, 60)

      if (urlData?.signedUrl) {
        const response = await fetch(urlData.signedUrl)
        const buffer = await response.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        setWorkbook(wb)
        setSheetNames(wb.SheetNames)
        setSelectedSheet(template.sheet_name)
        const headers = parseSheetHeaders(wb, template.sheet_name)
        setDetectedHeaders(headers)
      } else {
        setDetectedHeaders(Object.keys(template.column_mappings))
      }
    } catch {
      setDetectedHeaders(Object.keys(template.column_mappings))
    }

    setColumnMappings({ ...template.column_mappings })
    setMode('upload')
    setUploadStep(2)
    setLoadingEdit(false)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!orgId) return
    setSaving(true)
    setSaveError(null)

    try {
      if (editingTemplateId) {
        // Update existing template's mappings
        const { error } = await supabase
          .from('roster_templates')
          .update({
            name: templateName,
            payer_id: selectedPayerId || null,
            column_mappings: columnMappings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingTemplateId)
        if (error) throw new Error(error.message)
      } else {
        if (!file) throw new Error('No file selected')
        const uuid = crypto.randomUUID()
        const filePath = `${orgId}/roster-templates/${uuid}-${file.name}`

        const { error: storageError } = await supabase.storage
          .from('rosters')
          .upload(filePath, file)
        if (storageError) throw new Error(storageError.message)

        const { error: dbError } = await supabase
          .from('roster_templates')
          .insert({
            organization_id: orgId,
            payer_id: selectedPayerId || null,
            name: templateName,
            file_path: filePath,
            file_name: file.name,
            sheet_name: selectedSheet,
            header_row: 1,
            column_mappings: columnMappings,
          })

        if (dbError) {
          await supabase.storage.from('rosters').remove([filePath])
          throw new Error(dbError.message)
        }
      }

      await fetchTemplates()
      resetUpload()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setDeleteId(id)
    const template = templates.find(t => t.id === id)
    const { error } = await supabase.from('roster_templates').delete().eq('id', id)
    if (!error && template?.file_path) {
      await supabase.storage.from('rosters').remove([template.file_path])
    }
    setDeleteId(null)
    await fetchTemplates()
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  const resetUpload = () => {
    setMode('list')
    setUploadStep(1)
    setEditingTemplateId(null)
    setFile(null)
    setWorkbook(null)
    setSheetNames([])
    setSelectedSheet('')
    setDetectedHeaders([])
    setTemplateName('')
    setSelectedPayerId('')
    setColumnMappings({})
    setSaveError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Pill style helper ────────────────────────────────────────────────────────

  const stepPill = (active: boolean) => ({
    fontSize: '12px',
    fontWeight: 600,
    color: active ? '#4f46e5' : '#94a3b8',
    padding: '4px 12px',
    borderRadius: '9999px',
    backgroundColor: active ? '#eef2ff' : 'transparent',
    border: `1px solid ${active ? '#4f46e5' : '#e2e8f0'}`,
  })

  const mappedCount = Object.keys(columnMappings).length

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="page-xl">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Rosters</h1>
          <p className="page-subtitle">Generate filled payer roster spreadsheets from provider data</p>
        </div>
        {mode === 'list' ? (
          <button className="btn btn-primary" onClick={() => setMode('upload')}>
            + Add Roster Template
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={resetUpload}>
            Cancel
          </button>
        )}
      </div>

      {/* ── LIST MODE ──────────────────────────────────────────────────────── */}
      {mode === 'list' && (
        <>
          {loading ? (
            <div style={{ fontSize: '13px', color: '#94a3b8', padding: '32px 0' }}>Loading templates…</div>
          ) : templates.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '72px 24px',
              border: '2px dashed #e2e8f0', borderRadius: '16px', backgroundColor: '#f8fafc',
            }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
                No roster templates yet
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>
                Upload a blank payer roster Excel file and map its columns to provider data.
              </div>
              <button className="btn btn-primary" onClick={() => setMode('upload')}>
                + Add Roster Template
              </button>
            </div>
          ) : (
            <div className="card-list">
              {templates.map(template => (
                <div key={template.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-title" style={{ marginBottom: '4px' }}>{template.name}</div>
                      <div className="card-meta" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {template.payers?.name && (
                          <span className="card-meta-item">{template.payers.name}</span>
                        )}
                        <span className="card-meta-item">Sheet: {template.sheet_name}</span>
                        <span className="card-meta-item">
                          {Object.keys(template.column_mappings).length} columns mapped
                        </span>
                        <span className="card-meta-item">
                          {new Date(template.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                      <Link
                        href={`/rosters/generate/${template.id}`}
                        className="btn btn-primary btn-sm"
                      >
                        Generate Roster
                      </Link>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleEditMapping(template)}
                        disabled={loadingEdit}
                      >
                        Edit Mapping
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(template.id)}
                        disabled={deleteId === template.id}
                        style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                      >
                        {deleteId === template.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── UPLOAD MODE ────────────────────────────────────────────────────── */}
      {mode === 'upload' && (
        <div>
          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px' }}>
            <span style={stepPill(uploadStep === 1)}>1 · Upload &amp; Configure</span>
            <span style={{ color: '#cbd5e1' }}>→</span>
            <span style={stepPill(uploadStep === 2)}>2 · Map Columns</span>
          </div>

          {/* ── Step 1 ──────────────────────────────────────────────────────── */}
          {uploadStep === 1 && (
            <div>
              {/* File picker */}
              <div className="card-lg" style={{ marginBottom: '16px' }}>
                <p className="section-label" style={{ marginBottom: '12px' }}>Upload Roster Template File</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ fontSize: '13px', color: '#475569' }}
                />
                {file && (
                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                    Selected: <strong style={{ color: '#0f172a' }}>{file.name}</strong>
                  </div>
                )}
              </div>

              {workbook && (
                <>
                  {/* Sheet selector */}
                  {sheetNames.length > 1 && (
                    <div className="card-lg" style={{ marginBottom: '16px' }}>
                      <p className="section-label" style={{ marginBottom: '8px' }}>Select Sheet</p>
                      <select
                        className="form-select"
                        value={selectedSheet}
                        onChange={e => handleSheetChange(e.target.value)}
                        style={{ maxWidth: '360px' }}
                      >
                        {sheetNames.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Detected headers */}
                  {detectedHeaders.length > 0 && (
                    <div className="card-lg" style={{ marginBottom: '16px' }}>
                      <p className="section-label" style={{ marginBottom: '8px' }}>
                        Detected Column Headers ({detectedHeaders.length})
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {detectedHeaders.map(h => (
                          <span
                            key={h}
                            className="pill"
                            style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '11px' }}
                          >
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Template config */}
                  <div className="card-lg" style={{ marginBottom: '20px' }}>
                    <p className="section-label" style={{ marginBottom: '12px' }}>Template Details</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '600px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Template Name <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input
                          className="form-input"
                          type="text"
                          value={templateName}
                          onChange={e => setTemplateName(e.target.value)}
                          placeholder="e.g. Humana Roster 2025"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                          Payer (optional)
                        </label>
                        <select
                          className="form-select"
                          value={selectedPayerId}
                          onChange={e => setSelectedPayerId(e.target.value)}
                        >
                          <option value="">— No payer —</option>
                          {payers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary"
                      disabled={!templateName.trim() || detectedHeaders.length === 0}
                      onClick={() => setUploadStep(2)}
                    >
                      Next: Map Columns →
                    </button>
                  </div>
                </>
              )}

              {!workbook && !file && (
                <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '12px' }}>
                  Upload a .xlsx or .xls file to continue.
                </div>
              )}
            </div>
          )}

          {/* ── Step 2 ──────────────────────────────────────────────────────── */}
          {uploadStep === 2 && (
            <div>
              <div className="card-lg" style={{ marginBottom: '20px' }}>
                <p className="section-label" style={{ marginBottom: '4px' }}>Map Columns to CredFast Fields</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  Columns that matched automatically are pre-mapped. Adjust any that are incorrect.
                  Unmapped columns are preserved in the output but left blank.
                </p>

                {/* Header row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '280px 240px',
                  gap: '12px',
                  padding: '6px 0 8px',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '4px',
                }}>
                  {['Template Column', 'Maps To'].map(h => (
                    <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                      {h}
                    </span>
                  ))}
                </div>

                {detectedHeaders.map(header => {
                  const isMapped = !!columnMappings[header]
                  return (
                    <div
                      key={header}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '280px 240px',
                        gap: '12px',
                        alignItems: 'center',
                        padding: '7px 0',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: isMapped ? '#0f172a' : '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {header}
                        {isMapped && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#16a34a' }}>✓</span>}
                      </div>
                      <select
                        className="form-select"
                        value={columnMappings[header] ?? ''}
                        onChange={e => setMapping(header, e.target.value)}
                        style={{ fontSize: '12px' }}
                      >
                        <option value="">— Ignore this column —</option>
                        {ROSTER_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {saveError && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#b91c1c',
                }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {!editingTemplateId && (
                    <button className="btn btn-secondary" onClick={() => setUploadStep(1)}>
                      ← Back
                    </button>
                  )}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {mappedCount} column{mappedCount !== 1 ? 's' : ''} mapped
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || mappedCount === 0 || !orgId}
                >
                  {saving ? 'Saving…' : editingTemplateId ? 'Save Changes' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
