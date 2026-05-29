import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
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

    const { data, error } = await supabase.storage
      .from('payer-forms')
      .createSignedUrl(formData.storage_path, 300) // 5-minute URL

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Could not generate view URL' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
