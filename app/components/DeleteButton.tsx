'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface Props {
  table:      string
  id:         string
  label?:     string
  redirectTo: string
}

export default function DeleteButton({ table, id, label = 'Delete', redirectTo }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete this ${label.toLowerCase()}? This cannot be undone.`)) return
    setDeleting(true)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      alert('Delete failed: ' + error.message)
      setDeleting(false)
      return
    }
    router.push(redirectTo)
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
        border: '1px solid #fecaca', cursor: deleting ? 'not-allowed' : 'pointer',
        backgroundColor: deleting ? '#fef2f2' : '#fff1f2',
        color: deleting ? '#f87171' : '#dc2626',
        transition: 'background-color 0.15s, border-color 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => { if (!deleting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2' }}
      onMouseLeave={(e) => { if (!deleting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fff1f2' }}
    >
      {deleting ? 'Deleting…' : label}
    </button>
  )
}
