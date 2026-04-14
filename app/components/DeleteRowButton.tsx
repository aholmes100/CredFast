'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

interface Props {
  table:   string
  id:      string
  label?:  string
}

export default function DeleteRowButton({ table, id, label = 'item' }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return
    setDeleting(true)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      alert('Delete failed: ' + error.message)
      setDeleting(false)
      return
    }
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      title={`Delete ${label}`}
      style={{
        background: 'none', border: '1px solid transparent',
        borderRadius: '6px', padding: '4px 8px',
        fontSize: '12px', fontWeight: 500,
        color: deleting ? '#f87171' : '#94a3b8',
        cursor: deleting ? 'not-allowed' : 'pointer',
        transition: 'color 0.15s, border-color 0.15s, background-color 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        if (!deleting) {
          const b = e.currentTarget as HTMLButtonElement
          b.style.color = '#dc2626'
          b.style.borderColor = '#fecaca'
          b.style.backgroundColor = '#fff1f2'
        }
      }}
      onMouseLeave={(e) => {
        if (!deleting) {
          const b = e.currentTarget as HTMLButtonElement
          b.style.color = '#94a3b8'
          b.style.borderColor = 'transparent'
          b.style.backgroundColor = 'transparent'
        }
      }}
    >
      {deleting ? '…' : 'Delete'}
    </button>
  )
}
