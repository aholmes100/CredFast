'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  formId: string
  initialPdfType: string
  initialRepeatingPageIndex: number | null
  initialLocationsPerPage: number
  initialStaticPages: number[] | null
  initialLocationSlotCount: number | null
  initialOverflowText: string
}

export default function PdfTypeConfig({
  formId,
  initialPdfType,
  initialRepeatingPageIndex,
  initialLocationsPerPage,
  initialStaticPages,
  initialLocationSlotCount,
  initialOverflowText,
}: Props) {
  const [pdfType,           setPdfType]           = useState(initialPdfType || 'single')
  // UI uses 1-indexed page numbers; DB stores 0-indexed
  const [repeatingPageNum,  setRepeatingPageNum]  = useState(
    initialRepeatingPageIndex !== null ? String(initialRepeatingPageIndex + 1) : ''
  )
  const [locationsPerPage,  setLocationsPerPage]  = useState(String(initialLocationsPerPage || 2))
  const [staticPageNums,    setStaticPageNums]    = useState(
    initialStaticPages ? initialStaticPages.map(p => p + 1).join(', ') : ''
  )
  const [slotCount,         setSlotCount]         = useState(
    initialLocationSlotCount !== null ? String(initialLocationSlotCount) : ''
  )
  const [overflowText,      setOverflowText]      = useState(initialOverflowText || 'See attached letter')
  const [saving,            setSaving]            = useState(false)
  const [saved,             setSaved]             = useState(false)
  const [error,             setError]             = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false)

    const parsePageList = (s: string): number[] | null => {
      const trimmed = s.trim()
      if (!trimmed) return null
      return trimmed.split(',')
        .map(n => parseInt(n.trim(), 10) - 1)  // convert 1-indexed → 0-indexed
        .filter(n => !isNaN(n) && n >= 0)
    }

    const update: Record<string, unknown> = {
      pdf_type:     pdfType,
      overflow_text: overflowText.trim() || 'See attached letter',
      updated_at:   new Date().toISOString(),
    }

    if (pdfType === 'repeating') {
      const rp = parseInt(repeatingPageNum, 10)
      update.repeating_page_index = !isNaN(rp) && rp >= 1 ? rp - 1 : null
      update.locations_per_page   = parseInt(locationsPerPage, 10) || 2
      update.static_pages         = parsePageList(staticPageNums)
    }

    if (pdfType === 'fixed') {
      const sc = parseInt(slotCount, 10)
      update.location_slot_count = !isNaN(sc) && sc >= 1 ? sc : null
    }

    const { error: saveError } = await supabase
      .from('payer_forms')
      .update(update)
      .eq('id', formId)

    setSaving(false)
    if (saveError) setError('Failed to save.')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  return (
    <div>
      <div className="form-field">
        <label className="form-label">PDF type</label>
        <select
          className="form-select"
          value={pdfType}
          onChange={e => setPdfType(e.target.value)}
          style={{ maxWidth: '260px' }}
        >
          <option value="single">Single location</option>
          <option value="fixed">Fixed slots — LOI overflow (e.g. Sagamore, Cigna)</option>
          <option value="repeating">Repeating page — all locations (e.g. MHS, CareSource)</option>
        </select>
      </div>

      {pdfType === 'fixed' && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'start' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Location slot count</label>
            <input
              className="form-input"
              type="number" min={1} max={10}
              value={slotCount}
              onChange={e => setSlotCount(e.target.value)}
              placeholder="e.g. 2"
              style={{ width: '80px' }}
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', maxWidth: '160px' }}>
              How many location slots the base form supports
            </p>
          </div>
          <div className="form-field" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
            <label className="form-label">Overflow text</label>
            <input
              className="form-input"
              type="text"
              value={overflowText}
              onChange={e => setOverflowText(e.target.value)}
              placeholder="See attached letter"
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Placed in the overflow slot when location count exceeds slot count.
              Map that PDF field to <code style={{ fontSize: '11px', backgroundColor: '#f1f5f9', padding: '1px 4px', borderRadius: '3px' }}>static.overflow</code>.
            </p>
          </div>
        </div>
      )}

      {pdfType === 'repeating' && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'start' }}>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Repeating page (1-indexed)</label>
            <input
              className="form-input"
              type="number" min={1}
              value={repeatingPageNum}
              onChange={e => setRepeatingPageNum(e.target.value)}
              placeholder="e.g. 3"
              style={{ width: '80px' }}
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', maxWidth: '160px' }}>
              The page that clones for overflow locations (page 3 on MHS)
            </p>
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Locations per page</label>
            <input
              className="form-input"
              type="number" min={1} max={6}
              value={locationsPerPage}
              onChange={e => setLocationsPerPage(e.target.value)}
              style={{ width: '80px' }}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
            <label className="form-label">Static pages (1-indexed, comma-separated)</label>
            <input
              className="form-input"
              type="text"
              value={staticPageNums}
              onChange={e => setStaticPageNums(e.target.value)}
              placeholder="e.g. 1, 2, 4"
            />
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
              Pages filled once and not cloned. MHS example: 1, 2, 4 (pages 1–2 are provider data, page 4 is attestation).
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '16px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={saving ? 'btn btn-disabled btn-sm' : 'btn btn-secondary btn-sm'}
          style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save Config'}
        </button>
        {saved  && <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
        {error  && <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {error}</span>}
      </div>
    </div>
  )
}
