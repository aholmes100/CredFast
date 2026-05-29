'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  orgId: string
  initialName: string
}

export default function OrgNameEditor({ orgId, initialName }: Props) {
  const [name, setName]         = useState(initialName)
  const [saving, setSaving]     = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const save = async () => {
    if (!name.trim() || name.trim() === initialName) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase
      .from('organizations')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', orgId)
    setSaving(false)
    if (err) { setError('Failed to save.'); return }
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2500)
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <input
        className="form-input"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        style={{ maxWidth: '320px' }}
      />
      <button
        onClick={save}
        disabled={saving || !name.trim() || name.trim() === initialName}
        className="btn btn-primary btn-sm"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      {justSaved && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>✓ Saved</span>}
      {error   && <span style={{ fontSize: '12px', color: '#dc2626' }}>{error}</span>}
    </div>
  )
}
