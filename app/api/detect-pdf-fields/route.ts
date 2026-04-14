import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument } from 'pdf-lib'
import { supabase } from '../../lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { payerFormId } = await req.json()
    if (!payerFormId) {
      return NextResponse.json({ error: 'payerFormId is required' }, { status: 400 })
    }

    const { data: formData, error: formError } = await supabase
      .from('payer_forms')
      .select('storage_path')
      .eq('id', payerFormId)
      .single()

    if (formError || !formData?.storage_path) {
      return NextResponse.json({ error: 'Form or PDF not found' }, { status: 404 })
    }

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('payer-forms')
      .download(formData.storage_path)

    if (downloadError || !pdfBlob) {
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 })
    }

    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc   = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    const pdfForm  = pdfDoc.getForm()
    const fields   = pdfForm.getFields()

    const detected = fields.map((f) => ({
      name: f.getName(),
      type: f.constructor.name.replace('PDF', '').replace('Field', ''),
    }))

    return NextResponse.json({ fields: detected })
  } catch (err) {
    console.error('Field detection error:', err)
    return NextResponse.json({ error: 'Failed to read PDF fields. The PDF may not have fillable fields.' }, { status: 500 })
  }
}
