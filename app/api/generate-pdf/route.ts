import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '../../lib/supabase-server'
import type { PdfFillPayload, Provider, Group, Location, EnrollmentApplication, FieldMappingValue } from '../../types'

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
//   location.field     → primary location (index 0), legacy format
//   location.N.field   → location at slot index N (0 = primary, 1 = 2nd, etc.)
//   static.overflow    → payload.overflow_text (the "See attached letter" placeholder)
//
// For plain boolean columns the fallback returns "Yes" / "No".
function resolvePath(path: string, payload: PdfFillPayload): string {
  const [prefix, ...rest] = path.split('.')
  const field = rest.join('.')

  // ── Static / literal values ────────────────────────────────────────────────
  if (prefix === 'static') {
    if (field === 'overflow') return payload.overflow_text
    return ''
  }

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

  // ── Slot-indexed location: "location.N.field" → locations[N] ──────────────
  if (prefix === 'location') {
    const slotMatch = field.match(/^(\d+)\.(.+)$/)
    if (slotMatch) {
      const slotIndex = parseInt(slotMatch[1], 10)
      const slotField = slotMatch[2]
      const loc = (payload.locations[slotIndex] ?? null) as unknown as Record<string, unknown> | null
      if (!loc) return ''
      const val = loc[slotField]
      if (val === null || val === undefined) return ''
      if (typeof val === 'boolean') return val ? 'Yes' : 'No'
      return String(val)
    }
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

// ─── Normalize a raw mapping value to FieldMappingValue ───────────────────────
// Plain strings (legacy format) are wrapped; the font size is read from the
// coordinate key so old entries don't silently lose their configured size.
function normalizeMapping(key: string, v: string | FieldMappingValue): FieldMappingValue {
  if (typeof v === 'string') {
    return { template: v, fontSize: parseCoord(key)?.size ?? 10 }
  }
  return v
}

// ─── Interpolate a template string against the fill payload ───────────────────
// Plain paths (no { } tokens) are forwarded to resolvePath unchanged so all
// existing mappings continue to work without modification.
//
// Template tokens:
//   {provider.npi}                          — single value
//   {location.0.city}                       — slot-indexed location
//   {provider.taxonomies[*].code}           — array expansion, join with ", "
//   {provider.taxonomies[*].code|separator=; } — array expansion, custom separator
function interpolateTemplate(template: string, payload: PdfFillPayload): string {
  if (!template.includes('{')) {
    // No tokens — backward-compat: treat as a plain resolvePath call
    return resolvePath(template, payload)
  }

  return template.replace(/\{([^}]+)\}/g, (_, raw: string) => {
    // Split off optional |separator=X suffix
    const sepIdx = raw.indexOf('|separator=')
    let path: string
    let separator = ', '
    if (sepIdx !== -1) {
      path      = raw.slice(0, sepIdx)
      separator = raw.slice(sepIdx + '|separator='.length)
    } else {
      path = raw
    }

    // Array expansion: prefix.field[*].subField
    const starMatch = path.match(/^([^[]+)\[\*\]\.(.+)$/)
    if (starMatch) {
      const arrayPath = starMatch[1]  // e.g. "provider.taxonomies"
      const subField  = starMatch[2]  // e.g. "code"

      // Access the source object directly — resolvePath always returns a string,
      // which would lose the array structure before we can iterate it.
      const [prefix, ...rest] = arrayPath.split('.')
      let source: Record<string, unknown> | null = null
      if      (prefix === 'provider')    source = payload.provider    as unknown as Record<string, unknown>
      else if (prefix === 'group')       source = payload.group       as unknown as Record<string, unknown>
      else if (prefix === 'application') source = payload.application as unknown as Record<string, unknown>

      if (!source) return ''
      const arr = rest.length > 0 ? source[rest.join('.')] : null
      if (!Array.isArray(arr)) return ''

      return (arr as Record<string, unknown>[])
        .map(item => {
          if (item === null || item === undefined) return ''
          if (typeof item === 'object') {
            const v = (item as Record<string, unknown>)[subField]
            return v === null || v === undefined ? '' : String(v)
          }
          return String(item)
        })
        .filter(Boolean)
        .join(separator)
    }

    // Single value — delegate to existing resolver
    return resolvePath(path, payload)
  })
}

export async function POST(req: NextRequest) {
  try {
    const { applicationId, payerFormId } = await req.json()

    if (!applicationId || !payerFormId) {
      return NextResponse.json({ error: 'applicationId and payerFormId are required' }, { status: 400 })
    }

    const supabase = await createClient()

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

    // Check for a group NPI override on any provider-location assignment for this application
    const locationIds = (locationRows ?? []).map(
      (r: unknown) => (r as { location_id: string }).location_id
    ).filter(Boolean)

    let effectiveGroupNpi = (groupData as Group).group_npi
    if (locationIds.length > 0) {
      const { data: overrideRow } = await supabase
        .from('provider_group_locations')
        .select('group_npi_override')
        .eq('provider_id', app.provider_id)
        .in('location_id', locationIds)
        .not('group_npi_override', 'is', null)
        .limit(1)
        .maybeSingle()
      if (overrideRow?.group_npi_override) {
        effectiveGroupNpi = overrideRow.group_npi_override as string
      }
    }

    const groupWithOverride: Group = { ...(groupData as Group), group_npi: effectiveGroupNpi }

    const payload: PdfFillPayload = {
      provider:     providerData as Provider,
      group:        groupWithOverride,
      locations,
      application:  app,
      overflow_text: (formData.overflow_text as string | null) ?? 'See attached letter',
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
    const mappings = (formData.field_mappings ?? {}) as Record<string, string | FieldMappingValue>

    // Embed Helvetica once for coordinate-based drawing
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const pages = pdfDoc.getPages()

    // Try AcroForm filling first (works on truly fillable PDFs).
    // getForm() is isolated so a PDF-without-AcroForm error doesn't swallow the loop.
    let pdfForm: ReturnType<typeof pdfDoc.getForm> | null = null
    try { pdfForm = pdfDoc.getForm() } catch { /* flat PDF — no AcroForm */ }

    if (pdfForm) {
      for (const pdfField of pdfForm.getFields()) {
        const fieldName = pdfField.getName()
        const rawVal = mappings[fieldName]
        if (!rawVal) continue
        const { template } = normalizeMapping(fieldName, rawVal)
        const value = interpolateTemplate(template, payload)
        try { pdfForm.getTextField(fieldName).setText(value) } catch { /* checkbox / not a text field */ }
      }
    }

    // Coordinate-based text overlay (works on any PDF)
    for (const [fieldName, rawVal] of Object.entries(mappings)) {
      const coord = parseCoord(fieldName)
      if (!coord) continue  // not a coordinate entry — handled above as AcroForm

      const { template, fontSize } = normalizeMapping(fieldName, rawVal)
      const value = interpolateTemplate(template, payload)
      if (!value) continue

      const pageIndex = coord.page - 1
      if (pageIndex < 0 || pageIndex >= pages.length) continue

      const page       = pages[pageIndex]
      const { height } = page.getSize()
      // Convert y from "top-down" to pdf-lib's "bottom-up"
      const yBottomUp  = height - coord.y - fontSize

      page.drawText(value, {
        x:    coord.x,
        y:    yBottomUp,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      })
    }

    // ── 4. Repeating page cloning for overflow locations ──────────────────────
    // When pdf_type === 'repeating', the base form already covers:
    //   - slot 0 (primary location) on static pages
    //   - slots 1..locationsPerPage on the single repeating page instance
    // For every additional chunk of locationsPerPage locations beyond that,
    // we clone the repeating page and fill it via coordinate overlay only.
    //
    // AcroForm field names cannot be used for cloned pages — the same field
    // names exist in the parent document and setting them would overwrite the
    // base-form values. Coordinate overlays draw directly onto the page surface
    // and are immune to this collision.
    //
    // Slot offset formula: for clone N (1-indexed), mapping slot S
    //   → payload.locations[ S + N * locationsPerPage ]
    {
      const pdfType            = formData.pdf_type             as string | null
      const repeatingPageIndex = formData.repeating_page_index as number | null
      const locationsPerPage   = (formData.locations_per_page  as number | null) ?? 2

      if (
        pdfType === 'repeating'  &&
        repeatingPageIndex !== null &&
        repeatingPageIndex < pdfDoc.getPageCount() &&
        locations.length > 0
      ) {
        // Total locations the base form covers: slot 0 + one repeating-page instance
        const baseFormCoverage = locationsPerPage + 1

        if (locations.length > baseFormCoverage) {
          // Isolate coordinate mappings that target the repeating page.
          // coord keys are 1-indexed page numbers ("3:x,y" = page 3).
          const repeatingPageNum = repeatingPageIndex + 1
          const repeatingCoordMappings = Object.entries(mappings).filter(([key]) => {
            const c = parseCoord(key)
            return c !== null && c.page === repeatingPageNum
          }) as Array<[string, string | FieldMappingValue]>

          if (repeatingCoordMappings.length === 0) {
            console.warn(
              `[generate-pdf] pdf_type=repeating but no coordinate mappings found for page ` +
              `${repeatingPageNum}. Overflow clones will be blank. ` +
              `Map repeating-page fields via coordinates (not AcroForm field names) to fill them.`
            )
          }

          const clonesNeeded = Math.ceil((locations.length - baseFormCoverage) / locationsPerPage)

          for (let cloneN = 1; cloneN <= clonesNeeded; cloneN++) {
            // Load a fresh copy of the original template so we copy an unfilled page.
            // The already-modified pdfDoc's version of the repeating page is filled
            // with base-form data and must not be used as a clone source.
            const freshDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
            const [blankPage] = await pdfDoc.copyPages(freshDoc, [repeatingPageIndex])

            // Insert immediately after the base repeating page and any prior clones.
            // Each insertion shifts subsequent pages forward by one, so clone N lands
            // at repeatingPageIndex + N — trailing static pages stay at the end.
            const insertAt = repeatingPageIndex + cloneN
            pdfDoc.insertPage(insertAt, blankPage)

            const clonePage = pdfDoc.getPage(insertAt)
            const { height: cloneH } = clonePage.getSize()

            // Shift the locations array so slot 0 = original slot (cloneN * locationsPerPage).
            // Templates like {location.0.city} automatically reference the correct location
            // for this clone — no manual slot-index arithmetic required.
            const clonePayload: PdfFillPayload = {
              ...payload,
              locations: payload.locations.slice(cloneN * locationsPerPage),
            }

            for (const [key, rawVal] of repeatingCoordMappings) {
              const coord = parseCoord(key)!
              const { template, fontSize } = normalizeMapping(key, rawVal)

              // Render only mappings that reference location data on clone pages.
              // Non-location mappings (provider, group, application) were already
              // drawn on the base form's repeating page; re-drawing them would
              // duplicate static text on every clone.
              //
              // The regex matches both plain paths ("location.0.city") and template
              // tokens ("{location.0.city}"), covering legacy and new mapping formats.
              if (!/(?:^|\{)location\.\d+\./.test(template)) continue

              const value = interpolateTemplate(template, clonePayload)
              if (!value) continue

              clonePage.drawText(value, {
                x:    coord.x,
                y:    cloneH - coord.y - fontSize,
                size: fontSize,
                font,
                color: rgb(0, 0, 0),
              })
            }
          }
        }
      }
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
