'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props { filePath: string; label?: string }

export default function DownloadDocumentButton({ filePath, label = '↓' }: Props) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const { data } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600)
    setLoading(false)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="btn btn-secondary btn-sm"
      style={{ fontSize: '11px' }}
    >
      {loading ? '…' : label}
    </button>
  )
}
