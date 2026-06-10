'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FieldMappingValue } from '../types'
import TemplateFieldPicker, { tokenDisplayName } from './TemplateFieldPicker'

const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
const PIN_COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#a16207']

function parseKey(key: string): { page: number; x: number; y: number; size: number } | null {
  const wp = key.match(/^(\d+):(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (wp) return { page: parseInt(wp[1]), x: parseFloat(wp[2]), y: parseFloat(wp[3]), size: wp[4] ? parseFloat(wp[4]) : 10 }
  const np = key.match(/^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (np) return { page: 1, x: parseFloat(np[1]), y: parseFloat(np[2]), size: np[3] ? parseFloat(np[3]) : 10 }
  return null
}

function buildKey(page: number, x: number, y: number): string {
  const rx = Math.round(x * 10) / 10
  const ry = Math.round(y * 10) / 10
  return page === 1 ? `${rx},${ry}` : `${page}:${rx},${ry}`
}

function normalizeInitial(raw: Record<string, string | FieldMappingValue>): Record<string, FieldMappingValue> {
  const result: Record<string, FieldMappingValue> = {}
  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'string') {
      result[key] = { template: val, fontSize: parseKey(key)?.size ?? 10 }
    } else {
      result[key] = val
    }
  }
  return result
}

function fieldLabel(template: string, key?: string): string {
  const m = template.match(/(\{[^}]+\})/)
  if (m) return tokenDisplayName(m[1])
  if (template) return template.slice(0, 20)
  if (key) return key
  return 'Unmapped'
}

interface DetectedField {
  fieldName: string
  fieldType: string
  page: number
  /** PDF pts, top-down origin */
  x: number
  y: number
  w: number
  h: number
}

interface PageMetadata {
  pageNum: number
  pdfWidth: number
  pdfHeight: number
  baseScale: number
}

interface PageInfo {
  pageNum: number
  pdfWidth: number
  pdfHeight: number
  scale: number
  canvasW: number
  canvasH: number
}

interface DragState {
  originalKey: string
  pageInfo: PageInfo
  startMouseX: number
  startMouseY: number
  originalPdfX: number
  originalPdfY: number
  hasMoved: boolean
}

interface Props {
  formId: string
  initialMappings: Record<string, string | FieldMappingValue>
}

export default function PdfFieldMapper({ formId, initialMappings }: Props) {
  const [mappings, setMappings] = useState<Record<string, FieldMappingValue>>(
    () => normalizeInitial(initialMappings)
  )
  const [pageMetadata, setPageMetadata] = useState<PageMetadata[]>([])
  const [zoomLevel, setZoomLevel] = useState(1.0)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const pages = useMemo<PageInfo[]>(() =>
    pageMetadata.map(m => {
      const scale = m.baseScale * zoomLevel
      return {
        pageNum: m.pageNum,
        pdfWidth: m.pdfWidth,
        pdfHeight: m.pdfHeight,
        scale,
        canvasW: Math.floor(m.pdfWidth * scale),
        canvasH: Math.floor(m.pdfHeight * scale),
      }
    }),
    [pageMetadata, zoomLevel]
  )

  // Placement tool state
  const [newTemplate, setNewTemplate] = useState('{provider.first_name}')
  const [fontSize, setFontSize] = useState(10)

  // Selection + drag
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [dragVisual, setDragVisual] = useState<{ key: string; pdfX: number; pdfY: number } | null>(null)

  // Guide crosshair
  const [guidePos, setGuidePos] = useState<{ pageNum: number; y: number; x: number } | null>(null)

  // AcroForm field detection
  const [detectedFields, setDetectedFields] = useState<DetectedField[]>([])
  const [showFieldBoxes, setShowFieldBoxes] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfDocRef = useRef<any>(null)
  const canvasEls = useRef<(HTMLCanvasElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStateRef = useRef<DragState | null>(null)
  const dragVisualRef = useRef<{ key: string; pdfX: number; pdfY: number } | null>(null)
  const mappingsRef = useRef<Record<string, FieldMappingValue>>({})
  const selectedKeyRef = useRef<string | null>(null)

  mappingsRef.current = mappings
  selectedKeyRef.current = selectedKey

  // ── Effect 1: load PDF ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setPdfLoading(true)
    setPdfError(null)
    setPageMetadata([])
    setDetectedFields([])
    setShowFieldBoxes(false)
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
        const vp1 = page.getViewport({ scale: 1 })
        metadata.push({
          pageNum: i,
          pdfWidth: vp1.width,
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

  // ── Effect 2: render pages ────────────────────────────────────────────────────
  useEffect(() => {
    if (pages.length === 0 || !pdfDocRef.current) return
    let cancelled = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeTasks: any[] = []

    async function renderAll() {
      for (let i = 0; i < pages.length; i++) {
        if (cancelled) break
        const info = pages[i]
        const canvas = canvasEls.current[i]
        if (!canvas) continue
        const page = await pdfDocRef.current.getPage(info.pageNum)
        if (cancelled) break
        const viewport = page.getViewport({ scale: info.scale })
        canvas.width = info.canvasW
        canvas.height = info.canvasH
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

  // ── Effect 3: detect AcroForm field boxes ─────────────────────────────────────
  // Depends on pageMetadata (not pages) so zoom changes don't trigger re-detection.
  useEffect(() => {
    if (pageMetadata.length === 0 || !pdfDocRef.current) return
    let cancelled = false

    async function detectAll() {
      const fields: DetectedField[] = []
      for (const meta of pageMetadata) {
        if (cancelled) break
        const page = await pdfDocRef.current.getPage(meta.pageNum)
        if (cancelled) break
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const annotations: any[] = await page.getAnnotations({ intent: 'display' })
        for (const ann of annotations) {
          if (ann.subtype !== 'Widget') continue
          const [x1, y1, x2, y2] = ann.rect as number[]
          fields.push({
            fieldName: ann.fieldName ?? ann.id ?? '',
            fieldType: ann.fieldType ?? 'Tx',
            page: meta.pageNum,
            x: x1,
            y: meta.pdfHeight - y2,   // convert bottom-up PDF coords to top-down
            w: x2 - x1,
            h: y2 - y1,
          })
        }
      }
      if (!cancelled) {
        setDetectedFields(fields)
        if (fields.length > 0) setShowFieldBoxes(true)
      }
    }

    detectAll()
    return () => { cancelled = true }
  }, [pageMetadata])

  // ── Global drag handlers ──────────────────────────────────────────────────────
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
          const oldVal = mappingsRef.current[drag.originalKey]
          if (oldVal !== undefined) {
            const newKey = buildKey(drag.pageInfo.pageNum, visual.pdfX, visual.pdfY)
            setMappings(prev => {
              const next = { ...prev }
              delete next[drag.originalKey]
              next[newKey] = oldVal
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

  // ── Arrow key nudge ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = selectedKeyRef.current
      if (!key) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const step = e.shiftKey ? 5 : 1
      let dx = 0, dy = 0
      if (e.key === 'ArrowUp') { dy = -step }
      else if (e.key === 'ArrowDown') { dy = step }
      else if (e.key === 'ArrowLeft') { dx = -step }
      else if (e.key === 'ArrowRight') { dx = step }
      else return
      e.preventDefault()
      const coord = parseKey(key)
      if (!coord) return
      const newKey = buildKey(coord.page, coord.x + dx, coord.y + dy)
      setMappings(prev => {
        const next = { ...prev }
        const val = next[key]
        delete next[key]
        next[newKey] = val
        return next
      })
      setSelectedKey(newKey)
      setIsDirty(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // ── Place pin on canvas click ─────────────────────────────────────────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>, pageInfo: PageInfo) => {
    if (dragStateRef.current?.hasMoved) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pdfX = (e.clientX - rect.left) / pageInfo.scale
    const pdfY = (e.clientY - rect.top) / pageInfo.scale
    const key = buildKey(pageInfo.pageNum, pdfX, pdfY)
    const template = newTemplate.trim() || '{provider.first_name}'
    setMappings(prev => ({ ...prev, [key]: { template, fontSize } }))
    setSelectedKey(key)
    setIsDirty(true)
  }

  // ── Click on detected field box ───────────────────────────────────────────────
  const handleFieldBoxClick = (f: DetectedField) => {
    if (dragStateRef.current?.hasMoved) return
    const key = buildKey(f.page, f.x, f.y)
    if (!(key in mappingsRef.current)) {
      const autoFontSize = Math.max(6, Math.min(Math.floor(f.h * 0.6), 12))
      setMappings(prev => ({ ...prev, [key]: { template: '', fontSize: autoFontSize } }))
      setIsDirty(true)
    }
    setSelectedKey(key)
  }

  // ── Start dragging a pin ──────────────────────────────────────────────────────
  const handlePinMouseDown = (e: React.MouseEvent, key: string, pageInfo: PageInfo) => {
    e.preventDefault()
    e.stopPropagation()
    const coord = parseKey(key)
    if (!coord) return
    dragStateRef.current = {
      originalKey: key, pageInfo,
      startMouseX: e.clientX, startMouseY: e.clientY,
      originalPdfX: coord.x, originalPdfY: coord.y,
      hasMoved: false,
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

  // ── Update selected pin's template ────────────────────────────────────────────
  const updateSelectedTemplate = (template: string) => {
    if (!selectedKey) return
    setMappings(prev => {
      const existing = prev[selectedKey]
      if (!existing) return prev
      return { ...prev, [selectedKey]: { ...existing, template } }
    })
    setIsDirty(true)
  }

  // ── Update selected pin's font size ───────────────────────────────────────────
  const updatePinSize = (key: string, size: number) => {
    if (isNaN(size) || size < 4) return
    setMappings(prev => {
      const existing = prev[key]
      if (!existing) return prev
      return { ...prev, [key]: { ...existing, fontSize: size } }
    })
    setIsDirty(true)
  }

  // ── Update selected pin's X or Y coordinate ───────────────────────────────────
  const updatePinCoord = (key: string, axis: 'x' | 'y', value: number) => {
    const coord = parseKey(key)
    if (!coord || isNaN(value)) return
    const newX = axis === 'x' ? value : coord.x
    const newY = axis === 'y' ? value : coord.y
    const newKey = buildKey(coord.page, newX, newY)
    setMappings(prev => {
      const next = { ...prev }
      const val = next[key]
      delete next[key]
      next[newKey] = val
      return next
    })
    setSelectedKey(newKey)
    setIsDirty(true)
  }

  // ── Zoom helpers ──────────────────────────────────────────────────────────────
  const zoomIn = () => setZoomLevel(z => { const next = ZOOM_STEPS.find(s => s > z); return next ?? z })
  const zoomOut = () => setZoomLevel(z => { const prev = [...ZOOM_STEPS].reverse().find(s => s < z); return prev ?? z })

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

  const selectedValue = selectedKey ? (mappings[selectedKey] ?? null) : null
  const selectedCoord = selectedKey ? parseKey(selectedKey) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 290px', gap: '16px', alignItems: 'start' }}>

      {/* ── LEFT: PDF pages ───────────────────────────────────────────────────── */}
      <div style={{ minWidth: 0 }}>
        {/* Zoom toolbar */}
        {!pdfLoading && pages.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '10px', padding: '6px 10px',
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
            flexWrap: 'wrap',
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

            <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155', minWidth: '42px', textAlign: 'center' }}>
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

            {/* Field box toggle */}
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '8px' }}>
              {detectedFields.length > 0 ? (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  fontSize: '11px', color: '#0f766e', cursor: 'pointer', userSelect: 'none',
                  backgroundColor: showFieldBoxes ? '#f0fdfa' : 'transparent',
                  border: `1px solid ${showFieldBoxes ? '#99f6e4' : '#e2e8f0'}`,
                  borderRadius: '5px', padding: '2px 7px',
                }}>
                  <input
                    type="checkbox"
                    checked={showFieldBoxes}
                    onChange={e => setShowFieldBoxes(e.target.checked)}
                    style={{ margin: 0, accentColor: '#0d9488' }}
                  />
                  {detectedFields.length} field{detectedFields.length !== 1 ? 's' : ''} detected
                </label>
              ) : (
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>No fillable fields detected — place manually</span>
              )}
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
            const pageFields = detectedFields.filter(f => f.page === pageInfo.pageNum)
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
                  onMouseLeave={() => { setGuidePos(null); setHoveredField(null) }}
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

                  {/* Crosshair guide */}
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
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 6,
                        left: guidePos.x + 8, top: guidePos.y - 18,
                        fontSize: 10, fontFamily: 'monospace',
                        color: 'rgba(79,70,229,0.8)',
                        backgroundColor: 'rgba(238,242,255,0.9)',
                        padding: '1px 5px', borderRadius: '3px',
                        whiteSpace: 'nowrap', border: '1px solid rgba(79,70,229,0.2)',
                      }}>
                        {Math.round(guidePos.x / pageInfo.scale)}, {Math.round(guidePos.y / pageInfo.scale)}
                      </div>
                      <div style={{
                        position: 'absolute', pointerEvents: 'none', zIndex: 5,
                        left: guidePos.x + 6, top: guidePos.y,
                        fontSize: guideScreenSize,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        fontWeight: 600, color: 'rgba(79,70,229,0.7)',
                        whiteSpace: 'nowrap', lineHeight: 1,
                      }}>
                        {fieldLabel(newTemplate || '{provider.first_name}')}
                      </div>
                    </>
                  )}

                  {/* ── AcroForm field box overlays (below pins) ── */}
                  {showFieldBoxes && pageFields.map(f => {
                    const fx = f.x * pageInfo.scale
                    const fy = f.y * pageInfo.scale
                    const fw = f.w * pageInfo.scale
                    const fh = f.h * pageInfo.scale
                    const fKey = buildKey(f.page, f.x, f.y)
                    const isMapped = fKey in mappings
                    const isSelected = selectedKey === fKey
                    const isHovered = hoveredField === `${f.page}-${f.x}-${f.y}`

                    return (
                      <div
                        key={`${f.page}-${f.x}-${f.y}`}
                        onClick={e => { e.stopPropagation(); handleFieldBoxClick(f) }}
                        onMouseEnter={() => setHoveredField(`${f.page}-${f.x}-${f.y}`)}
                        onMouseLeave={() => setHoveredField(null)}
                        style={{
                          position: 'absolute',
                          left: fx, top: fy, width: fw, height: fh,
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          zIndex: 6,
                          borderRadius: '2px',
                          border: isMapped
                            ? `2px solid ${isSelected ? '#15803d' : '#16a34a'}`
                            : isHovered
                              ? '2px solid #0d9488'
                              : '1.5px solid #14b8a6',
                          backgroundColor: isMapped
                            ? isSelected
                              ? 'rgba(22,163,74,0.18)'
                              : 'rgba(22,163,74,0.10)'
                            : isHovered
                              ? 'rgba(20,184,166,0.18)'
                              : 'rgba(20,184,166,0.06)',
                          boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px #16a34a` : 'none',
                          transition: 'background-color 0.1s, border-color 0.1s',
                          overflow: 'hidden',
                        }}
                      >
                        {isMapped && (
                          <span style={{
                            position: 'absolute', top: 1, right: 2,
                            fontSize: Math.max(8, Math.min(fh * 0.55, 11)),
                            color: '#15803d', lineHeight: 1, fontWeight: 700,
                            pointerEvents: 'none',
                          }}>✓</span>
                        )}
                        {!isMapped && fh > 14 && (
                          <span style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: Math.max(7, Math.min(fh * 0.42, 10)),
                            color: isHovered ? 'rgba(13,148,136,0.9)' : 'rgba(20,184,166,0.7)',
                            whiteSpace: 'nowrap',
                            maxWidth: '92%', overflow: 'hidden', textOverflow: 'ellipsis',
                            lineHeight: 1, pointerEvents: 'none',
                          }}>
                            {f.fieldName}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Placed pins (above field boxes) */}
                  {pagePins.map(([key, mappingValue]) => {
                    const coord = parseKey(key)
                    if (!coord) return null
                    const color = colorForKey(key)
                    const isDragging = dragVisual?.key === key
                    const isSelected = selectedKey === key
                    const displayX = isDragging && dragVisual ? dragVisual.pdfX * pageInfo.scale : coord.x * pageInfo.scale
                    const displayY = isDragging && dragVisual ? dragVisual.pdfY * pageInfo.scale : coord.y * pageInfo.scale
                    const pinFontSize = Math.round(Math.max(10, Math.min(mappingValue.fontSize * pageInfo.scale, 14)))

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
                          padding: '1px 5px 1px 3px',
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
                        {fieldLabel(mappingValue.template, key)}
                      </div>
                    )
                  })}

                  {/* Drag guide line */}
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

      {/* ── RIGHT: control panel ──────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: '24px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', paddingRight: '2px' }}>

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
            <TemplateFieldPicker value={newTemplate} onChange={setNewTemplate} />
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
        {selectedKey && selectedValue && selectedCoord && (
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

            <div className="form-field">
              <TemplateFieldPicker value={selectedValue.template} onChange={updateSelectedTemplate} />
            </div>

            <div className="form-field">
              <label className="form-label">Font size (pt)</label>
              <input
                className="form-input"
                type="number" min={4} max={24}
                value={selectedValue.fontSize}
                onChange={e => updatePinSize(selectedKey, Number(e.target.value))}
                style={{ width: '70px' }}
              />
            </div>

            {/* Position controls */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '2px' }}>
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
              {mappingEntries.map(([key, mappingValue]) => {
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
                      {fieldLabel(mappingValue.template, key)}
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

const nudgeBtnStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '5px',
  border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
  cursor: 'pointer', fontSize: '13px', fontWeight: 600,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#475569', lineHeight: 1,
  padding: 0,
}