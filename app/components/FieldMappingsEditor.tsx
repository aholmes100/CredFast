'use client'

import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FieldMappingValue } from '../types'

const DATA_PATHS: Record<string, string[]> = {
  provider: [
    'first_name', 'last_name', 'npi', 'email', 'date_of_birth', 'gender',
    'specialty', 'taxonomy_code',
    'license_number', 'license_state', 'license_expiration',
    'dea_number', 'caqh_number', 'medicaid_number', 'medicare_number',
    'malpractice_carrier', 'malpractice_policy', 'malpractice_expiration',
    'malpractice_per_occurrence', 'malpractice_aggregate',
    'medical_school', 'graduation_year',
    'residency_program', 'residency_completion',
    'fellowship_program', 'fellowship_completion',
    'board_certified', 'board_specialty', 'board_expiration',
    'accepting_new_patients',
  ],
  group: [
    'name', 'legal_name', 'tax_id', 'group_npi', 'taxonomy_code',
    'medicaid_group_number', 'medicare_group_number', 'practice_type',
    'authorized_official_name', 'authorized_official_title',
    'authorized_official_phone', 'authorized_official_email',
  ],
  location: [
    'name', 'address_1', 'address_2', 'city', 'state', 'zip', 'county',
    'phone', 'fax', 'facility_type',
    'accepts_new_patients', 'handicap_accessible',
    'accepts_medicaid', 'accepts_medicare',
    'hours_mon_fri', 'hours_weekend',
  ],
  application: [
    'status', 'submitted_at', 'approved_at', 'effective_date', 'payer_reference',
  ],
  static: ['overflow'],
}

const LOCATION_SLOT_LABELS = ['Primary (1st)', 'Slot 2', 'Slot 3', 'Slot 4', 'Slot 5']

interface DetectedField { name: string; type: string }

interface Props {
  formId: string
  initialMappings: Record<string, string | FieldMappingValue>
  hasPdf: boolean
}

type InputMode = 'acroform' | 'coordinate'

function normalizeInitial(raw: Record<string, string | FieldMappingValue>): Record<string, FieldMappingValue> {
  const result: Record<string, FieldMappingValue> = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      const sizeMatch = key.match(/,(\d+(?:\.\d+)?)$/)
      const fontSize = sizeMatch ? parseFloat(sizeMatch[1]) : 10
      result[key] = { template: val, fontSize }
    } else {
      result[key] = val
    }
  }
  return result
}

function insertToken(
  token: string,
  inputRef: React.RefObject<HTMLInputElement | null>,
  getVal: () => string,
  setVal: (v: string) => void,
) {
  const input = inputRef.current
  const current = getVal()
  const start = input?.selectionStart ?? current.length
  const end = input?.selectionEnd ?? start
  const next = current.slice(0, start) + token + current.slice(end)
  setVal(next)
  requestAnimationFrame(() => {
    if (input) {
      input.setSelectionRange(start + token.length, start + token.length)
      input.focus()
    }
  })
}

export default function FieldMappingsEditor({ formId, initialMappings, hasPdf }: Props) {
  const [mappings, setMappings] = useState<Record<string, FieldMappingValue>>(
    () => normalizeInitial(initialMappings)
  )
  const [inputMode, setInputMode] = useState<InputMode>('coordinate')
  // AcroForm mode
  const [newPdfField, setNewPdfField] = useState('')
  // Coordinate mode
  const [coordX, setCoordX] = useState('')
  const [coordY, setCoordY] = useState('')
  const [coordPage, setCoordPage] = useState('1')
  // Shared template fields
  const [newTemplate, setNewTemplate] = useState('{provider.first_name}')
  const [newFontSize, setNewFontSize] = useState(10)
  // UI state
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Detect
  const [detected, setDetected] = useState<DetectedField[] | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)
  // View PDF
  const [loadingUrl, setLoadingUrl] = useState(false)

  const newTemplateInputRef = useRef<HTMLInputElement | null>(null)

  // ── View PDF ──────────────────────────────────────────────────────────────────
  const handleViewPdf = async () => {
    setLoadingUrl(true)
    const res = await fetch('/api/pdf-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payerFormId: formId }),
    })
    setLoadingUrl(false)
    if (!res.ok) { alert('Could not open PDF.'); return }
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  // ── Detect AcroForm fields ────────────────────────────────────────────────────
  const handleDetect = async () => {
    setDetecting(true)
    setDetectError(null)
    const res = await fetch('/api/detect-pdf-fields', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payerFormId: formId }),
    })
    setDetecting(false)
    if (!res.ok) { const b = await res.json().catch(() => ({})); setDetectError(b.error ?? 'Failed.'); return }
    const { fields } = await res.json()
    setDetected(fields)
    if (fields.length > 0) setInputMode('acroform')
  }

  // ── Build coordinate key (no size — size lives in value) ──────────────────────
  const buildCoordKey = (): string => {
    const x = coordX.trim()
    const y = coordY.trim()
    const p = coordPage.trim() || '1'
    if (!x || !y) return ''
    return p === '1' ? `${x},${y}` : `${p}:${x},${y}`
  }

  // ── Add mapping ───────────────────────────────────────────────────────────────
  const addMapping = () => {
    setError(null)
    let key = ''
    if (inputMode === 'acroform') {
      key = newPdfField.trim()
      if (!key) { setError('Enter a PDF field name.'); return }
    } else {
      key = buildCoordKey()
      if (!key) { setError('Enter X and Y coordinates.'); return }
    }
    const template = newTemplate.trim()
    if (!template) { setError('Enter a template.'); return }
    setMappings(prev => ({ ...prev, [key]: { template, fontSize: newFontSize } }))
    if (inputMode === 'acroform') setNewPdfField('')
    else { setCoordX(''); setCoordY('') }
    setIsDirty(true)
  }

  const addFromDetected = (fieldName: string) => {
    setInputMode('acroform')
    setNewPdfField(fieldName)
  }

  const removeMapping = (key: string) => {
    setMappings(prev => { const n = { ...prev }; delete n[key]; return n })
    setIsDirty(true)
  }

  const handleSave = async () => {
    setSaving(true); setError(null); setJustSaved(false)
    const { error: saveError } = await supabase
      .from('payer_forms')
      .update({ field_mappings: mappings, updated_at: new Date().toISOString() })
      .eq('id', formId)
    setSaving(false)
    if (saveError) { setError('Failed to save mappings.') }
    else { setIsDirty(false); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500) }
  }

  const isCoordKey = (k: string) => /^\d/.test(k) && k.includes(',')
  const mappedFields = new Set(Object.keys(mappings))

  // ── Token insert select ───────────────────────────────────────────────────────
  const TokenInsertSelect = () => (
    <select
      value=""
      onChange={e => {
        if (e.target.value) insertToken(e.target.value, newTemplateInputRef, () => newTemplate, setNewTemplate)
      }}
      className="form-select"
      style={{ fontSize: '11px' }}
    >
      <option value="">Insert token…</option>
      <optgroup label="Provider">
        {DATA_PATHS.provider.map(f => (
          <option key={f} value={`{provider.${f}}`}>{`provider.${f}`}</option>
        ))}
      </optgroup>
      <optgroup label="Group">
        {DATA_PATHS.group.map(f => (
          <option key={f} value={`{group.${f}}`}>{`group.${f}`}</option>
        ))}
      </optgroup>
      {[0, 1, 2, 3, 4].map(slot => (
        <optgroup key={slot} label={LOCATION_SLOT_LABELS[slot]}>
          {DATA_PATHS.location.map(f => (
            <option key={f} value={`{location.${slot}.${f}}`}>{`loc.${slot}.${f}`}</option>
          ))}
        </optgroup>
      ))}
      <optgroup label="Application">
        {DATA_PATHS.application.map(f => (
          <option key={f} value={`{application.${f}}`}>{`application.${f}`}</option>
        ))}
      </optgroup>
      <optgroup label="Static">
        <option value="{static.overflow}">static.overflow</option>
      </optgroup>
    </select>
  )

  return (
    <div>

      {/* Toolbar: View PDF + Detect Fields */}
      {hasPdf && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <button onClick={handleViewPdf} disabled={loadingUrl}
            className={loadingUrl ? 'btn btn-disabled btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ cursor: loadingUrl ? 'not-allowed' : 'pointer' }}>
            {loadingUrl ? 'Opening…' : 'View PDF'}
          </button>
          <button onClick={handleDetect} disabled={detecting}
            className={detecting ? 'btn btn-disabled btn-sm' : 'btn btn-secondary btn-sm'}
            style={{ cursor: detecting ? 'not-allowed' : 'pointer' }}>
            {detecting ? 'Reading…' : 'Detect Fillable Fields'}
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Open the PDF to find coordinates, or detect if it has fillable fields.
          </span>
        </div>
      )}

      {detectError && <div className="alert-error" style={{ fontSize: '12px', marginBottom: '12px' }}>{detectError}</div>}

      {/* Detected AcroForm fields panel */}
      {detected !== null && (
        <div style={{ marginBottom: '16px' }}>
          {detected.length === 0 ? (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', fontSize: '13px', color: '#a16207' }}>
              No fillable fields found — this is a flat PDF. Use <strong>Coordinate mode</strong> below to place text by position.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '8px 14px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', display: 'grid', gridTemplateColumns: '1fr 80px 120px' }}>
                <span>Field Name in PDF</span><span>Type</span><span>Status</span>
              </div>
              <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                {detected.map((f) => {
                  const isMapped = mappedFields.has(f.name)
                  return (
                    <div key={f.name} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px', alignItems: 'center', padding: '8px 14px', borderBottom: '1px solid #f1f5f9', backgroundColor: isMapped ? '#f0fdf4' : '#fff' }}>
                      <code style={{ fontSize: '12px', fontFamily: 'monospace' }}>{f.name}</code>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{f.type}</span>
                      {isMapped
                        ? <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 500 }}>✓ mapped</span>
                        : <button onClick={() => addFromDetected(f.name)} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 8px', fontSize: '11px', color: '#4f46e5', cursor: 'pointer', fontWeight: 500 }}>+ Map</button>
                      }
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '8px 14px', backgroundColor: '#f8fafc', fontSize: '12px', color: '#64748b' }}>
                {detected.length} fields · {mappedFields.size} mapped
              </div>
            </div>
          )}
        </div>
      )}

      {/* Existing mappings table */}
      {Object.keys(mappings).length > 0 ? (
        <div style={{ marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>Field / Coordinates</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>Template</th>
                <th style={{ width: '40px' }} />
              </tr>
            </thead>
            <tbody>
              {Object.entries(mappings).map(([key, mappingValue]) => (
                <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    {isCoordKey(key) ? (
                      <span style={{ fontSize: '12px', color: '#7c3aed', backgroundColor: '#f5f3ff', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>
                        📍 {key}
                      </span>
                    ) : (
                      <code style={{ fontSize: '12px', fontFamily: 'monospace' }}>{key}</code>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <code style={{ backgroundColor: '#f1f5f9', color: '#4f46e5', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                      {mappingValue.template}
                    </code>
                    {mappingValue.fontSize !== 10 && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: '#94a3b8' }}>{mappingValue.fontSize}pt</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button onClick={() => removeMapping(key)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1 }} title="Remove">×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
          No mappings yet. {hasPdf ? 'Click "View PDF" to open the form and note field positions.' : 'Add mappings below.'}
        </p>
      )}

      {/* Add mapping form */}
      <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
          {(['coordinate', 'acroform'] as InputMode[]).map((m) => (
            <button key={m} onClick={() => setInputMode(m)} style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', cursor: 'pointer',
              backgroundColor: inputMode === m ? '#4f46e5' : '#e2e8f0',
              color: inputMode === m ? '#ffffff' : '#64748b',
            }}>
              {m === 'coordinate' ? '📍 Coordinates' : '📝 Field Name'}
            </button>
          ))}
        </div>

        {inputMode === 'coordinate' ? (
          <>
            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '12px', color: '#1d4ed8', lineHeight: '1.6' }}>
              <strong>How to find coordinates:</strong> Click <em>View PDF</em> above to open the form in a new tab. In your browser&apos;s PDF viewer, hover over a field — the status bar shows the cursor position. On a standard letter page (612 × 792 pt), X goes left→right, Y goes top→bottom.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 60px', gap: '8px', marginBottom: '10px' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">X (left)</label>
                <input className="form-input" type="number" value={coordX} onChange={e => setCoordX(e.target.value)} placeholder="e.g. 120" />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Y (top)</label>
                <input className="form-input" type="number" value={coordY} onChange={e => setCoordY(e.target.value)} placeholder="e.g. 650" />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Page</label>
                <input className="form-input" type="number" min={1} value={coordPage} onChange={e => setCoordPage(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Template</label>
                <input
                  ref={newTemplateInputRef}
                  className="form-input"
                  type="text"
                  value={newTemplate}
                  onChange={e => setNewTemplate(e.target.value)}
                  placeholder="{provider.first_name}"
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Token</label>
                <TokenInsertSelect />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Size</label>
                <input className="form-input" type="number" min={6} max={24} value={newFontSize} onChange={e => setNewFontSize(Number(e.target.value))} style={{ width: '60px' }} />
              </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={addMapping} className="btn btn-secondary btn-sm">Add</button>
            </div>

            {coordX && coordY && (
              <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                Key: <code style={{ color: '#7c3aed' }}>{buildCoordKey() || '…'}</code>
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '8px', alignItems: 'end' }}>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">PDF Field Name</label>
                <input className="form-input" value={newPdfField} onChange={e => setNewPdfField(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMapping()} placeholder="e.g. Last_Name" />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Template</label>
                <input
                  ref={newTemplateInputRef}
                  className="form-input"
                  type="text"
                  value={newTemplate}
                  onChange={e => setNewTemplate(e.target.value)}
                  placeholder="{provider.first_name}"
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="form-label">Token</label>
                <TokenInsertSelect />
              </div>
              <button onClick={addMapping} className="btn btn-secondary btn-sm" style={{ alignSelf: 'end' }}>Add</button>
            </div>
          </>
        )}

        {error && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>⚠ {error}</p>}
      </div>

      {/* Save bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={handleSave} disabled={saving || !isDirty}
          className={isDirty && !saving ? 'btn btn-primary' : 'btn btn-disabled'}
          style={{ cursor: isDirty && !saving ? 'pointer' : 'not-allowed' }}>
          {saving ? 'Saving…' : 'Save Mappings'}
        </button>
        {justSaved && !saving && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
        {isDirty && !saving && !justSaved && <span style={{ fontSize: '12px', color: '#94a3b8' }}>Unsaved changes</span>}
      </div>
    </div>
  )
}
