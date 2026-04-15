import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { supabase } from '../../lib/supabase'
import type { PdfFillPayload, Provider, Group, Location, EnrollmentApplication } from '../../types'

// ─── Resolve a data path like "provider.npi" against the payload ──────────────
// Supports computed / virtual paths in addition to raw DB columns:
//
//   provider.full_name                  → "First [MI] Last[, Suffix]"
//   provider.middle_initial             → first character of middle_name
//   provider.is_pcp_yes                 → "X" when is_pcp is true, else ""
//   provider.is_pcp_no                  → "X" when is_pcp is false, else ""
//   provider.accepting_new_patients_yes → "X" when accepting_new_patients is true
//   provider.accepting_new_patients_no  → "X" when accepting_new_patients is false
//
// For plain boolean columns the fallback returns "Yes" / "No".
function resolvePath(path: string, payload: PdfFillPayload): string {
  const [prefix, ...rest] = path.split('.')
  const field = rest.join('.')

  // ── Computed provider paths ────────────────────────────────────────────────
  if (prefix === 'provider') {
    const p = payload.provider
    if (field === 'full_name') {
      const parts: string[] = [p.first_name]
      if (p.middle_name) parts.push(p.middle_name.charAt(0).toUpperCase() + '.')
      parts.push(p.last_name)
      const base = parts.join(' ')
      return p.credential_suffix ? `${base}, ${p.credential_suffix}` : base
    }
    if (field === 'middle_initial') {
      return p.middle_name ? p.middle_name.charAt(0).toUpperCase() + '.' : ''
    }
    if (field === 'is_pcp_yes')                  return p.is_pcp === true  ? 'X' : ''
    if (field === 'is_pcp_no')                   return p.is_pcp !== true  ? 'X' : ''
    if (field === 'accepting_new_patients_yes')   return p.accepting_new_patients === true  ? 'X' : ''
    if (field === 'accepting_new_patients_no')    return p.accepting_new_patients !== true  ? 'X' : ''
  }

  // ── Raw column lookup ──────────────────────────────────────────────────────
  let source: Record<string, unknown> | null = null
  if (prefix === 'provider')         source = payload.provider    as unknown as Record<string, unknown>
  else if (prefix === 'group')       source = payload.group       as unknown as Record<string, unknown>
  else if (prefix === 'location')    source = (payload.locations[0] ?? null) as unknown as Record<string, unknown>
  else if (prefix === 'application') source = payload.application as unknown as Record<string, unknown>

  if (!source) return ''
  const value = source[field]
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// ─── Parse coordinate field names ─────────────────────────────────────────────
// Formats supported:
//   "x,y"          → page 1, x from left, y from TOP, font size 9
//   "x,y,size"     → page 1, custom font size
//   "p:x,y"        → specific page, font size 9
//   "p:x,y,size"   → specific page, custom font size
interface CoordPlacement {
  page: number   // 1-indexed
  x:    number   // from left, in PDF points
  y:    number   // from TOP of page, in PDF points (we convert internally)
  size: number   // font size in points
}

function parseCoord(fieldName: string): CoordPlacement | null {
  // Try "p:x,y,size" or "p:x,y"
  const withPage = fieldName.match(/^(\d+):(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (withPage) {
    return {
      page: parseInt(withPage[1], 10),
      x:    parseFloat(withPage[2]),
      y:    parseFloat(withPage[3]),
      size: withPage[4] ? parseFloat(withPage[4]) : 9,
    }
  }
  // Try "x,y,size" or "x,y"
  const noPage = fieldName.match(/^(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?))?$/)
  if (noPage) {
    return {
      page: 1,
      x:    parseFloat(noPage[1]),
      y:    parseFloat(noPage[2]),
      size: noPage[3] ? parseFloat(noPage[3]) : 9,
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { applicationId, payerFormId } = await req.json()

    if (!applicationId || !payerFormId) {
      return NextResponse.json({ error: 'applicationId and payerFormId are required' }, { status: 400 })
    }

    // ── 1. Load all related records ────────────────────────────────────────────
    const [
      { data: appData,  error: appError  },
      { data: formData, error: formError },
    ] = await Promise.all([
      supabase.from('enrollment_applications').select('*').eq('id', applicationId).single(),
      supabase.from('payer_forms').select('*').eq('id', payerFormId).single(),
    ])

    if (appError  || !appData)  return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    if (formError || !formData) return NextResponse.json({ error: 'Payer form not found'  }, { status: 404 })

    const app = appData as EnrollmentApplication

    const [
      { data: providerData, error: providerError },
      { data: groupData,    error: groupError    },
      { data: locationRows                        },
    ] = await Promise.all([
      supabase.from('providers').select('*').eq('id', app.provider_id).single(),
      supabase.from('groups').select('*').eq('id', app.group_id).single(),
      supabase.from('enrollment_application_locations')
        .select('location_id, locations(*)')
        .eq('enrollment_application_id', applicationId),
    ])

    if (providerError || !providerData) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    if (groupError    || !groupData)    return NextResponse.json({ error: 'Group not found'    }, { status: 404 })

    const locations: Location[] = (locationRows ?? [])
      .map((r: unknown) => (r as { locations: Location | null }).locations)
      .filter((l): l is Location => l !== null)

    const payload: PdfFillPayload = {
      provider:    providerData as Provider,
      group:       groupData    as Group,
      locations,
      application: app,
    }

    // ── 2. Download PDF template ───────────────────────────────────────────────
    const storagePath = formData.storage_path as string | null
    if (!storagePath) {
      return NextResponse.json({ error: 'No PDF template uploaded for this form' }, { status: 400 })
    }

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('payer-forms')
      .download(storagePath)

    if (downloadError || !pdfBlob) {
      return NextResponse.json({ error: 'Failed to download PDF template' }, { status: 500 })
    }

    // ── 3. Fill / overlay ─────────────────────────────────────────────────────
    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const mappings = (formData.field_mappings ?? {}) as Record<string, string>

    // Embed Helvetica once for coordinate-based drawing
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    // Try AcroForm filling first (works on truly fillable PDFs)
    try {
      const pdfForm = pdfDoc.getForm()
      for (const pdfField of pdfForm.getFields()) {
        const fieldName = pdfField.getName()
        const dataPath  = mappings[fieldName]
        if (!dataPath) continue
        const value = resolvePath(dataPath, payload)
        try { pdfForm.getTextField(fieldName).setText(value) } catch { /* not a text field */ }
      }
    } catch { /* PDF has no AcroForm — fine, we'll use coordinates below */ }

    // Coordinate-based text overlay (works on any PDF)
    for (const [fieldName, dataPath] of Object.entries(mappings)) {
      const coord = parseCoord(fieldName)
      if (!coord) continue  // not a coordinate entry — handled above as AcroForm

      const value = resolvePath(dataPath, payload)
      if (!value) continue

      const pageIndex = coord.page - 1
      if (pageIndex < 0 || pageIndex >= pages.length) continue

      const page       = pages[pageIndex]
      const { height } = page.getSize()
      // Convert y from "top-down" to pdf-lib's "bottom-up"
      const yBottomUp  = height - coord.y - coord.size

      page.drawText(value, {
        x:    coord.x,
        y:    yBottomUp,
        size: coord.size,
        font,
        color: rgb(0, 0, 0),
      })
    }

    const filledBytes = await pdfDoc.save()

    // ── 4. Upload to storage & log ────────────────────────────────────────────
    const outputName = `${applicationId}/${payerFormId}-${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('application-documents')
      .upload(outputName, filledBytes, { contentType: 'application/pdf', upsert: true })

    if (!uploadError) {
      await supabase.from('application_documents').insert([{
        enrollment_application_id: applicationId,
        payer_form_id:             payerFormId,
        storage_path:              outputName,
        generated_by:              'system',
      }])
    }

    // ── 5. Return filled PDF ──────────────────────────────────────────────────
    return new NextResponse(Buffer.from(filledBytes), {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="enrollment-${applicationId}.pdf"`,
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
