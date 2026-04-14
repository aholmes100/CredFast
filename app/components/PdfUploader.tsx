'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface Props {
  formId: string
}

export default function PdfUploader({ formId }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const router    = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are accepted.')
      return
    }
    setUploading(true)
    setError(null)

    const fileName = `${crypto.randomUUID()}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('payer-forms')
      .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setUploading(false)
      setError(`Upload failed: ${uploadError.message}`)
      return
    }

    const { error: updateError } = await supabase
      .from('payer_forms')
      .update({ storage_path: fileName, updated_at: new Date().toISOString() })
      .eq('id', formId)

    setUploading(false)
    if (updateError) {
      setError('PDF uploaded but failed to save path.')
      return
    }

    router.refresh()
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={uploading ? 'btn btn-disabled btn-sm' : 'btn btn-secondary btn-sm'}
        style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
        {uploading ? 'Uploading…' : 'Choose PDF'}
      </button>
      {error && <span style={{ fontSize: '12px', color: '#dc2626' }}>⚠ {error}</span>}
    </div>
  )
}
