'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const DATA_PATHS: Record<string, string[]> = {
  provider: [
    // Computed / derived (not raw DB columns)
    'full_name',            // "First [MI.] Last[, Suffix]"
    'middle_initial',       // first char of middle_name + "."
    // Name fields
    'first_name','last_name','middle_name','credential_suffix',
    // Contact
    'npi','email','phone','date_of_birth','gender',
    // Sensitive identifiers
    'ssn','provider_tax_id',
    // Practice
    'specialty','secondary_specialty','taxonomy_code',
    'languages','hospital_affiliation',
    // Boolean columns (plain Yes/No text)
    'is_pcp','accepting_new_patients',
    // Boolean Y/N checkbox pairs (place on separate PDF checkboxes)
    'is_pcp_yes','is_pcp_no',
    'accepting_new_patients_yes','accepting_new_patients_no',
    // Credentials
    'license_number','license_state','license_expiration',
    'dea_number','caqh_number','medicaid_number','medicare_number',
    // Malpractice
    'malpractice_carrier','malpractice_policy','malpractice_expiration',
    'malpractice_per_occurrence','malpractice_aggregate',
    // Education
    'medical_school','graduation_year','residency_program','residency_completion',
    'fellowship_program','fellowship_completion',
    // Board certification
    'board_certified','board_specialty','board_expiration',
  ],
  group: [
    'name','legal_name','tax_id','group_npi','taxonomy_code',
    'medicaid_group_number','medicare_group_number','practice_type',
    'authorized_official_name','authorized_official_title',
    'authorized_official_phone','authorized_official_email',
    'credentialing_contact_name','credentialing_contact_email',
    'credentialing_contact_phone','credentialing_contact_fax',
    // Billing address
    'billing_name','billing_address_1','billing_address_2',
    'billing_city','billing_state','billing_zip',
    'billing_phone','billing_fax',
  ],
  location: [
    // Service / physical address
    'name','address_1','address_2','city','state','zip','county',
    // Mailing address (may differ)
    'mailing_address_1','mailing_address_2',
    'mailing_city','mailing_state','mailing_zip',
    'phone','fax','facility_type','accepts_new_patients','handicap_accessible',
    'accepts_medicaid','accepts_medicare','hours_mon_fri','hours_weekend',
  ],
  application: ['status','submitted_at','approved_at','effective_date','payer_reference'],
}

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
const PIN_COLORS = ['#4f46e5','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#a16207']

function parseKey(key: string): { page: number; x: number; y: number; size: number } | null {
  const wp = key.match(/^(\d+):(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (wp) return { page: parseInt(wp[1]), x: parseFloat(wp[2]), y: parseFloat(wp[3]), size: wp[4] ? parseFloat(wp[4]) : 9 }
  const np = key.match(/^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (np) return { page: 1, x: parseFloat(np[1]), y: parseFloat(np[2]), size: np[3] ? parseFloat(np[3]) : 9 }
  return null
}

function buildKey(page: number, x: number, y: number, size: number): string {
  const rx = Math.round(x * 10) / 10
  const ry = Math.round(y * 10) / 10
  const base = page === 1 ? `${rx},${ry}` : `${page}:${rx},${ry}`
  return size !== 9 ? `${base},${size}` : base
}

function fieldLabel(path: string) {
  return path
    .replace('provider.', '')
    .replace('group.', 'grp: ')
    .replace('location.', 'loc: ')
    .replace('application.', 'app: ')
}

// Raw page dimensions + base scale (before zoom)
interface PageMetadata {
  pageNum:   number
  pdfWidth:  number
  pdfHeight: number
  baseScale: number  // fit-to-container scale at 100% zoom
}

// Zoom-adjusted display info (what render effects use)
interface PageInfo {
  pageNum:   number
  pdfWidth:  number
  pdfHeight: number
  scale:     number  // baseScale * zoomLevel
  canvasW:   number
  canvasH:   number
}

interface DragState {
  originalKey: string
  pageInfo: PageInfo
  startMouseX: number
  startMouseY: number
  originalPdfX: number
  originalPdfY: number
  size: number
  hasMoved: boolean
}

interface Props {
  formId: string
  initialMappings: Record<string, string>
}

export default function PdfFieldMapper({ formId, initialMappings }: Props) {
  const [mappings,     setMappings]     = useState<Record<string, string>>(initialMappings)
  const [pageMetadata, setPageMetadata] = useState<PageMetadata[]>([])
  const [zoomLevel,    setZoomLevel]    = useState(1.0)
  const [pdfLoading,   setPdfLoading]   = useState(true)
  const [pdfError,     setPdfError]     = useState<string | null>(null)

  // Derive zoom-adjusted PageInfo from metadata + current zoom
  const pages = useMemo<PageInfo[]>(() =>
    pageMetadata.map(m => {
      const scale = m.baseScale * zoomLevel
      return {
        pageNum:  m.pageNum,
        pdfWidth:  m.pdfWidth,
        pdfHeight: m.pdfHeight,
        scale,
        canvasW: Math.floor(m.pdfWidth  * scale),
        canvasH: Math.floor(m.pdfHeight * scale),
      }
    }),
    [pageMetadata, zoomLevel]
  )

  // Active placement tool
  const [activeCategory, setActiveCategory] = useState('provider')
  const [activeField,    setActiveField]    = useState(DATA_PATHS['provider'][0])
  const [fontSize,       setFontSize]       = useState(9)

  // Selection + drag
  const [selectedKey,  setSelectedKey]  = useState<string | null>(null)
  const [dragVisual,   setDragVisual]   = useState<{ key: string; pdfX: number; pdfY: number } | null>(null)

  // Guide crosshair
  const [guidePos, setGuidePos] = useState<{ pageNum: number; y: number; x: number } | null>(null)

  // Save state
  const [saving,    setSaving]    = useState(false)
  const [isDirty,   setIsDirty]   = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef      = useRef<any>(null)
  const canvasEls      = useRef<(HTMLCanvasElement | null)[]>([])
  const containerRef   = useRef<HTMLDivElement>(null)
  const dragStateRef   = useRef<DragState | null>(null)
  const dragVisualRef  = useRef<{ key: string; pdfX: number; pdfY: number } | null>(null)
  const mappingsRef    = useRef<Record<string, string>>(initialMappings)
  const selectedKeyRef = useRef<string | null>(null)
  mappingsRef.current    = mappings
  selectedKeyRef.current = selectedKey

  // ── Effect 1: load PDF and compute base scales ──────────────────────────────
  useEffect(() => {
    let cancelled = false
    setPdfLoading(true)
    setPdfError(null)
    setPageMetadata([])
    canvasEls.current = []
    if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null }

    async function load() {
      const res = await fetch('/api/pdf-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payerFormId: formId }),
      })
      if (!res.ok) throw new Error('Could not load PDF.')
      const { url } = await res.json()

      const pdfjsLib = await import('pdfjs-dist')
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString()
      } catch {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
      }

      if (cancelled) return
      const doc = await pdfjsLib.getDocument({ url }).promise
      if (cancelled) { doc.destroy(); return }
      pdfDocRef.current = doc

      const containerW = containerRef.current?.clientWidth ?? 700
      const metadata: PageMetadata[] = []
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const vp1  = page.getViewport({ scale: 1 })
        metadata.push({
          pageNum:   i,
          pdfWidth:  vp1.width,
          pdfHeight: vp1.height,
          baseScale: Math.min((containerW - 4) / vp1.width, 1.5),
        })
      }

      if (!cancelled) { setPageMetadata(metadata); setPdfLoading(false) }
    }

    load().catch(e => { if (!cancelled) { setPdfError(String(e)); setPdfLoading(false) } })

    return () => {
      cancelled = true
      if (pdfDocRef.current) { pdfDocRef.current.destroy(); pdfDocRef.current = null }
      canvasEls.current.forEach(c => { if (c) { c.width = 1; c.height = 1 } })
    }
  }, [formId])

  // ── Effect 2: render pages to canvases (re-runs when zoom changes) ──────────
  useEffect(() => {
    if (pages.length === 0 || !pdfDocRef.current) return
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTasks: any[] = []

    async function renderAll() {
      for (let i = 0; i < pages.length; i++) {
        if (cancelled) break
        const info   = pages[i]
        const canvas = canvasEls.current[i]
        if (!canvas) continue
        const page     = await pdfDocRef.current.getPage(info.pageNum)
        if (cancelled) break
        const viewport = page.getViewport({ scale: info.scale })
        canvas.width   = info.canvasW
        canvas.height  = info.canvasH
        const ctx = canvas.getContext('2d')
        if (!ctx || cancelled) break
        const task = page.render({ canvasContext: ctx, viewport })
        activeTasks.push(task)
        try { await task.promise } catch { /* cancelled */ }
      }
    }

    renderAll()
    return () => {
      cancelled = true
      activeTasks.forEach(t => { try { t.cancel() } catch { /* ignore */ } })
      canvasEls.current.forEach(c => { if (c) { c.width = 1; c.height = 1 } })
    }
  }, [pages])

  // ── Global drag handlers ────────────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragStateRef.current
      if (!drag) return
      const dx = e.clientX - drag.startMouseX
      const dy = e.clientY - drag.startMouseY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.hasMoved = true
      const newPdfX = Math.max(0, drag.originalPdfX + dx / drag.pageInfo.scale)
      const newPdfY = Math.max(0, drag.originalPdfY + dy / drag.pageInfo.scale)
      const v = { key: drag.originalKey, pdfX: newPdfX, pdfY: newPdfY }
      dragVisualRef.current = v
      setDragVisual(v)
    }

    const onMouseUp = () => {
      const drag = dragStateRef.current
      if (!drag) return

      if (drag.hasMoved) {
        const visual = dragVisualRef.current
        if (visual) {
          const oldPath = mappingsRef.current[drag.originalKey]
          if (oldPath !== undefined) {
            const newKey = buildKey(drag.pageInfo.pageNum, visual.pdfX, visual.pdfY, drag.size)
            setMappings(prev => {
              const next = { ...prev }
              delete next[drag.originalKey]
              next[newKey] = oldPath
              return next
            })
            setSelectedKey(newKey)
            setIsDirty(true)
          }
        }
      }

      dragStateRef.current = null
      dragVisualRef.current = null
      setDragVisual(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  // ── Arrow key nudge ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = selectedKeyRef.current
      if (!key) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const step = e.shiftKey ? 5 : 1
      let dx = 0, dy = 0
      if (e.key === 'ArrowUp')    { dy = -step }
      else if (e.key === 'ArrowDown')  { dy =  step }
      else if (e.key === 'ArrowLeft')  { dx = -step }
      else if (e.key === 'ArrowRight') { dx =  step }
      else return
      e.preventDefault()
      const coord = parseKey(key)
      if (!coord) return
      const newKey = buildKey(coord.page, coord.x + dx, coord.y + dy, coord.size)
      setMappings(prev => {
        const next = { ...prev }
        const path = next[key]
        delete next[key]
        next[newKey] = path
        return next
      })
      setSelectedKey(newKey)
      setIsDirty(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Place pin on canvas click ───────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageInfo: PageInfo) => {
    if (dragStateRef.current?.hasMoved) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left)  / pageInfo.scale
    const pdfY = (e.clientY - rect.top)   / pageInfo.scale
    const key  = buildKey(pageInfo.pageNum, pdfX, pdfY, fontSize)
    setMappings(prev => ({ ...prev, [key]: `${activeCategory}.${activeField}` }))
    setSelectedKey(key)
    setIsDirty(true)
  }

  // ── Start dragging a pin ────────────────────────────────────────────────────
  const handlePinMouseDown = (e: React.MouseEvent, key: string, pageInfo: PageInfo) => {
    e.preventDefault()
    e.stopPropagation()
    const coord = parseKey(key)
    if (!coord) return
    dragStateRef.current = {
      originalKey: key, pageInfo,
      startMouseX: e.clientX, startMouseY: e.clientY,
      originalPdfX: coord.x, originalPdfY: coord.y,
      size: coord.size, hasMoved: false,
    }
    setDragVisual({ key, pdfX: coord.x, pdfY: coord.y })
    dragVisualRef.current = { key, pdfX: coord.x, pdfY: coord.y }
    setSelectedKey(key)
  }

  const removeMapping = (key: string) => {
    setMappings(prev => { const n = { ...prev }; delete n[key]; return n })
    if (selectedKey === key) setSelectedKey(null)
    setIsDirty(true)
  }

  // ── Update selected pin's data path ────────────────────────────────────────
  const updateSelectedField = (cat: string, field: string) => {
    if (!selectedKey) return
    setMappings(prev => ({ ...prev, [selectedKey]: `${cat}.${field}` }))
    setIsDirty(true)
  }

  // ── Update selected pin's X or Y coordinate ────────────────────────────────
  const updatePinCoord = (key: string, axis: 'x' | 'y', value: number) => {
    const coord = parseKey(key)
    if (!coord || isNaN(value)) return
    const newX = axis === 'x' ? value : coord.x
    const newY = axis === 'y' ? value : coord.y
    const newKey = buildKey(coord.page, newX, newY, coord.size)
    setMappings(prev => {
      const next = { ...prev }
      const path = next[key]
      delete next[key]
      next[newKey] = path
      return next
    })
    setSelectedKey(newKey)
    setIsDirty(true)
  }

  // ── Update selected pin's font size ────────────────────────────────────────
  const updatePinSize = (key: string, size: number) => {
    const coord = parseKey(key)
    if (!coord || isNaN(size) || size < 4) return
    const newKey = buildKey(coord.page, coord.x, coord.y, size)
    setMappings(prev => {
      const next = { ...prev }
      const path = next[key]
      delete next[key]
      next[newKey] = path
      return next
    })
    setSelectedKey(newKey)
    setIsDirty(true)
  }

  // ── Zoom helpers ────────────────────────────────────────────────────────────
  const zoomIn  = () => setZoomLevel(z => {
    const next = ZOOM_STEPS.find(s => s > z)
    return next ?? z
  })
  const zoomOut = () => setZoomLevel(z => {
    const prev = [...ZOOM_STEPS].reverse().find(s => s < z)
    return prev ?? z
  })

  const handleSave = async () => {
    setSaving(true); setSaveError(null); setJustSaved(false)
    const { error } = await supabase.from('payer_forms')
      .update({ field_mappings: mappings, updated_at: new Date().toISOString() })
      .eq('id', formId)
    setSaving(false)
    if (error) setSaveError('Failed to save.')
    else { setIsDirty(false); setJustSaved(true); setTimeout(() => setJustSaved(false), 2500) }
  }

  const mappingEntries = Object.entries(mappings)
  const colorForKey = (key: string) =>
    PIN_COLORS[mappingEntries.findIndex(([k]) => k === key) % PIN_COLORS.length]

  const selectedPath  = selectedKey ? mappings[selectedKey] : null
  const selCat        = selectedPath ? selectedPath.split('.')[0] : null
  const selField      = selectedPath ? selectedPath.split('.').slice(1).join('.') : null
  const selectedCoord = selectedKey ? parseKey(selectedKey) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '16px', alignItems: 'start' }}>

      {/* ── LEFT: PDF pages ─────────────────────────────────────────────────── */}
      <div style={{ minWidth: 0 }}>
        {/* Zoom toolbar */}
        {!pdfLoading && pages.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '10px', padding: '6px 10px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          }}>
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= ZOOM_STEPS[0]}
              style={{
                width: 28, height: 28, borderRadius: '6px', border: '1px solid #e2e8f0',
                backgroundColor: '#fff', cursor: zoomLevel <= ZOOM_STEPS[0] ? 'not-allowed' : 'pointer',
                fontSize: '16px', lineHeight: 1, color: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: zoomLevel <= ZOOM_STEPS[0] ? 0.4 : 1,
              }}
            >−</button>

            <span style={{
              fontSize: '12px', fontWeight: 600, color: '#334155',
              minWidth: '42px', textAlign: 'center',
            }}>
              {Math.round(zoomLevel * 100)}%
            </span>

            <button
              onClick={zoomIn}
              disabled={zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              style={{
                width: 28, height: 28, borderRadius: '6px', border: '1px solid #e2e8f0',
                backgroundColor: '#fff', cursor: zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length - 1] ? 'not-allowed' : 'pointer',
                fontSize: '16px', lineHeight: 1, color: '#475569',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: zoomLevel >= ZOOM_STEPS[ZOOM_STEPS.length - 1] ? 0.4 : 1,
              }}
            >+</button>

            {/* Quick zoom presets */}
            <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
              {[0.75, 1.0, 1.5, 2.0].map(z => (
                <button
                  key={z}
                  onClick={() => setZoomLevel(z)}
                  style={{
                    padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                    cursor: 'pointer', border: '1px solid',
                    borderColor: zoomLevel === z ? '#6366f1' : '#e2e8f0',
                    backgroundColor: zoomLevel === z ? '#eef2ff' : '#fff',
                    color: zoomLevel === z ? '#4f46e5' : '#64748b',
                  }}
                >
                  {Math.round(z * 100)}%
                </button>
              ))}
            </div>

            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
              {selectedKey ? 'Arrow keys nudge 1pt · Shift+arrow = 5pt' : 'Click to place · Drag to reposition'}
            </span>
          </div>
        )}

        {/* Scrollable canvas container */}
        <div ref={containerRef} style={{ overflowX: 'auto', userSelect: 'none' }}>
          {pdfLoading && (
            <div style={{ padding: '48px', textAlign: 'center', fontSize: '13px', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              Loading PDF…
            </div>
          )}
          {pdfError && <div className="alert-error">{pdfError}</div>}

          {pages.map((pageInfo, i) => {
            const pagePins = mappingEntries.filter(([key]) => parseKey(key)?.page === pageInfo.pageNum)
            const isDraggingOnThisPage = dragVisual && parseKey(dragVisual.key)?.page === pageInfo.pageNum
            const guideScreenSize = Math.round(Math.max(11, Math.min(fontSize * pageInfo.scale, 15)))

            return (
              <div key={pageInfo.pageNum} style={{ marginBottom: '16px' }}>
                {pages.length > 1 && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Page {pageInfo.pageNum}
                  </div>
                )}

                <div
                  onClick={e => handleCanvasClick(e, pageInfo)}
                  onMouseMove={e => {
                    if (dragStateRef.current) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    setGuidePos({ pageNum: pageInfo.pageNum, y: e.clientY - rect.top, x: e.clientX - rect.left })
                  }}
                  onMouseLeave={() => setGuidePos(null)}
                  style={{
                    position: 'relative', display: 'inline-block',
                    cursor: 'crosshair',
                    border: '2px solid #e2e8f0', borderRadius: '6px', overflow: 'visible',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                    width: pageInfo.canvasW, maxWidth: 'none',
                  }}
                >
                  <canvas
                    ref={el => { canvasEls.current[i] = el }}
                    width={pageInfo.canvasW}
                    height={pageInfo.canvasH}
                    style={{ display: 'block', borderRadius: '4px' }}
                  />

                  {/* ── Crosshair guide ───────────────────────────────────── */}
                  {guidePos?.pageNum === pageInfo.pageNum && !isDraggingOnThisPage && (
                    <>
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 4,
                        left: 0, right: 0, top: guidePos.y,
                        height: 0, borderTop: '1px dashed rgba(79,70,229,0.45)',
                      }} />
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 4,
                        top: 0, bottom: 0, left: guidePos.x,
                        width: 0, borderLeft: '1px dashed rgba(79,70,229,0.25)',
                      }} />
                      {/* Coordinate readout at cursor */}
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 6,
                        left: guidePos.x + 8, top: guidePos.y - 18,
                        fontSize: 10, fontFamily: 'monospace',
                        color: 'rgba(79,70,229,0.8)',
                        backgroundColor: 'rgba(238,242,255,0.9)',
                        padding: '1px 5px', borderRadius: '3px',
                        whiteSpace: 'nowrap',
                        border: '1px solid rgba(79,70,229,0.2)',
                      }}>
                        {Math.round(guidePos.x / pageInfo.scale)}, {Math.round(guidePos.y / pageInfo.scale)}
                      </div>
                      {/* Preview label */}
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 5,
                        left: guidePos.x + 6, top: guidePos.y,
                        fontSize: guideScreenSize,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontWeight: 600, color: 'rgba(79,70,229,0.7)',
                        whiteSpace: 'nowrap', lineHeight: 1,
                      }}>
                        {activeField}
                      </div>
                    </>
                  )}

                  {/* ── Placed pins ───────────────────────────────────────── */}
                  {pagePins.map(([key, path]) => {
                    const coord      = parseKey(key)
                    if (!coord) return null
                    const color      = colorForKey(key)
                    const isDragging = dragVisual?.key === key
                    const isSelected = selectedKey === key
                    const displayX   = isDragging && dragVisual ? dragVisual.pdfX * pageInfo.scale : coord.x * pageInfo.scale
                    const displayY   = isDragging && dragVisual ? dragVisual.pdfY * pageInfo.scale : coord.y * pageInfo.scale
                    const pinFontSize = Math.round(Math.max(10, Math.min(coord.size * pageInfo.scale, 14)))

                    return (
                      <div
                        key={key}
                        onMouseDown={e => handlePinMouseDown(e, key, pageInfo)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: displayX, top: displayY,
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          backgroundColor: `${color}e6`, color: '#fff',
                          borderRadius: '3px', borderLeft: `3px solid ${color}`,
                          padding: `1px 5px 1px 3px`,
                          fontSize: pinFontSize, fontFamily: 'Helvetica, Arial, sans-serif',
                          fontWeight: 700, lineHeight: 1.2, whiteSpace: 'nowrap',
                          cursor: isDragging ? 'grabbing' : 'grab',
                          zIndex: isDragging ? 100 : isSelected ? 20 : 10,
                          pointerEvents: 'all',
                          transition: isDragging ? 'none' : 'box-shadow 0.1s',
                          boxShadow: isDragging
                            ? '0 6px 16px rgba(0,0,0,0.3)'
                            : isSelected
                              ? `0 0 0 2px #fff, 0 0 0 4px ${color}`
                              : '0 1px 3px rgba(0,0,0,0.2)',
                        }}
                      >
                        <span style={{ opacity: 0.65, fontSize: pinFontSize - 1 }}>⠿</span>
                        {fieldLabel(path)}
                      </div>
                    )
                  })}

                  {/* ── Drag guide line ───────────────────────────────────── */}
                  {isDraggingOnThisPage && dragVisual && (
                    <div style={{
                      position: 'absolute', pointerEvents: 'none', zIndex: 4,
                      left: 0, right: 0,
                      top: dragVisual.pdfY * pageInfo.scale,
                      height: 0, borderTop: '1px solid rgba(79,70,229,0.5)',
                    }} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: control panel ────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* Place new field */}
        <div style={{
          backgroundColor: '#fff',
          border: `1px solid ${selectedKey ? '#e2e8f0' : '#c7d2fe'}`,
          borderRadius: '10px', padding: '14px',
          boxShadow: selectedKey ? 'none' : '0 0 0 3px #eef2ff',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#4f46e5', marginBottom: '12px' }}>
            Place Field
          </p>

          <div className="form-field">
            <label className="form-label">Category</label>
            <select className="form-select" value={activeCategory}
              onChange={e => { setActiveCategory(e.target.value); setActiveField(DATA_PATHS[e.target.value][0]) }}>
              {Object.keys(DATA_PATHS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Field</label>
            <select className="form-select" value={activeField}
              onChange={e => setActiveField(e.target.value)}>
              {DATA_PATHS[activeCategory].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label">Font size (pt)</label>
            <input className="form-input" type="number" min={4} max={24} value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))} style={{ width: '70px' }} />
          </div>

          {!selectedKey && (
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '10px', marginBottom: 0 }}>
              Hover to preview · Click to place
            </p>
          )}
        </div>

        {/* Selected pin editor */}
        {selectedKey && selCat && selField && selectedCoord && (
          <div style={{
            backgroundColor: '#fff',
            border: `2px solid ${colorForKey(selectedKey)}`,
            borderRadius: '10px', padding: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: colorForKey(selectedKey), flexShrink: 0 }} />
                <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#334155', margin: 0 }}>
                  Selected
                </p>
              </div>
              <button
                onClick={() => removeMapping(selectedKey)}
                style={{
                  background: 'none', border: '1px solid #fecaca', borderRadius: '4px',
                  color: '#dc2626', cursor: 'pointer', fontSize: '11px', padding: '2px 8px', fontWeight: 500,
                }}>
                Remove
              </button>
            </div>

            {/* Data path */}
            <div className="form-field">
              <label className="form-label">Category</label>
              <select className="form-select" value={selCat}
                onChange={e => updateSelectedField(e.target.value, DATA_PATHS[e.target.value][0])}>
                {Object.keys(DATA_PATHS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Field</label>
              <select className="form-select" value={selField}
                onChange={e => updateSelectedField(selCat, e.target.value)}>
                {DATA_PATHS[selCat]?.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Font size for this pin */}
            <div className="form-field">
              <label className="form-label">Font size (pt)</label>
              <input
                className="form-input"
                type="number" min={4} max={24}
                value={selectedCoord.size}
                onChange={e => updatePinSize(selectedKey, Number(e.target.value))}
                style={{ width: '70px' }}
              />
            </div>

            {/* Precision X / Y controls */}
            <div style={{
              borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '2px',
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px' }}>
                Position (PDF pts)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                <div>
                  <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>X</label>
                  <input
                    className="form-input"
                    type="number" step="0.5"
                    value={Math.round(selectedCoord.x * 10) / 10}
                    onChange={e => updatePinCoord(selectedKey, 'x', parseFloat(e.target.value))}
                    style={{ fontSize: '12px', padding: '4px 6px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Y</label>
                  <input
                    className="form-input"
                    type="number" step="0.5"
                    value={Math.round(selectedCoord.y * 10) / 10}
                    onChange={e => updatePinCoord(selectedKey, 'y', parseFloat(e.target.value))}
                    style={{ fontSize: '12px', padding: '4px 6px' }}
                  />
                </div>
              </div>

              {/* Nudge arrow buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '3px', width: '90px', margin: '0 auto' }}>
                <div />
                <button onClick={() => {
                  const coord = parseKey(selectedKey); if (coord) updatePinCoord(selectedKey, 'y', coord.y - 1)
                }} style={nudgeBtnStyle}>↑</button>
                <div />
                <button onClick={() => {
                  const coord = parseKey(selectedKey); if (coord) updatePinCoord(selectedKey, 'x', coord.x - 1)
                }} style={nudgeBtnStyle}>←</button>
                <button onClick={() => {
                  const coord = parseKey(selectedKey); if (coord) updatePinCoord(selectedKey, 'y', coord.y + 1)
                }} style={nudgeBtnStyle}>↓</button>
                <button onClick={() => {
                  const coord = parseKey(selectedKey); if (coord) updatePinCoord(selectedKey, 'x', coord.x + 1)
                }} style={nudgeBtnStyle}>→</button>
              </div>
              <p style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', marginTop: '5px', marginBottom: 0 }}>
                1pt · or use arrow keys
              </p>
            </div>
          </div>
        )}

        {/* Mapped fields list */}
        {mappingEntries.length > 0 && (
          <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '8px' }}>
              {mappingEntries.length} mapped
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {mappingEntries.map(([key, path]) => {
                const isSel = selectedKey === key
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedKey(isSel ? null : key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '5px 6px', borderRadius: '6px', cursor: 'pointer',
                      backgroundColor: isSel ? '#f1f5f9' : 'transparent',
                      border: `1px solid ${isSel ? colorForKey(key) + '40' : 'transparent'}`,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, backgroundColor: colorForKey(key) }} />
                    <span style={{ fontSize: '11px', color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fieldLabel(path)}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); removeMapping(key) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}
                    >×</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={isDirty && !saving ? 'btn btn-primary btn-full' : 'btn btn-disabled btn-full'}
          style={{ cursor: isDirty && !saving ? 'pointer' : 'not-allowed' }}
        >
          {saving ? 'Saving…' : isDirty ? 'Save Mappings' : 'Saved'}
        </button>
        {justSaved && <p style={{ fontSize: '12px', color: '#16a34a', textAlign: 'center', marginTop: '2px', fontWeight: 500 }}>✓ Saved</p>}
        {saveError && <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center', marginTop: '2px' }}>⚠ {saveError}</p>}
      </div>
    </div>
  )
}

// Small shared style for nudge arrow buttons
const nudgeBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '5px',
  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#475569', lineHeight: 1,
  padding: 0,
}
