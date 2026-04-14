'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import type { Payer } from '../../types'

export default function NewPayerFormPage() {
  const router = useRouter()
  const [payers, setPayers] = useState<Payer[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('payers').select('id, name').order('name')
      .then(({ data }) => { if (data) setPayers(data as Payer[]) })
  }, [])

  async function handleSubmit(formData: FormData) {
    const name     = (formData.get('name') as string).trim()
    const payerId  = formData.get('payer_id') as string
    const description = (formData.get('description') as string).trim()

    if (!name) { setError('Form name is required.'); return }

    setSaving(true)
    setError(null)

    let storagePath: string | null = null

    // Upload PDF if provided
    if (file) {
      const ext = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('payer-forms')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: false })

      if (uploadError) {
        setSaving(false)
        setError(`Upload failed: ${uploadError.message}`)
        return
      }
      storagePath = fileName
    }

    const { data, error: insertError } = await supabase
      .from('payer_forms')
      .insert([{
        name,
        payer_id:     payerId || null,
        description:  description || null,
        storage_path: storagePath,
        field_mappings: {},
        is_active:    true,
      }])
      .select()
      .single()

    setSaving(false)
    if (insertError || !data) {
      setError('Failed to create form. Please try again.')
      return
    }

    router.push(`/payer-forms/${data.id}`)
  }

  return (
    <main className="page">
      <Link href="/payer-forms" className="back-link">← Payer Forms</Link>
      <h1 className="page-title" style={{ marginBottom: '20px' }}>New Payer Form</h1>

      <div className="form-card">
        <form action={handleSubmit}>
          <div className="form-field">
            <label className="form-label">Form Name</label>
            <input className="form-input" name="name"
              placeholder="e.g. Anthem Commercial Enrollment" />
          </div>

          <div className="form-field">
            <label className="form-label">Payer</label>
            <select className="form-select" name="payer_id">
              <option value="">Select payer (optional)</option>
              {payers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <input className="form-input" name="description"
              placeholder="Brief description of this form (optional)" />
          </div>

          <div className="form-field">
            <label className="form-label">PDF Template</label>
            <input type="file" accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{
                fontSize: '13px', color: '#0f172a',
                border: '1px solid #cbd5e1', borderRadius: '8px',
                padding: '8px 12px', backgroundColor: '#ffffff', width: '100%',
                boxSizing: 'border-box', cursor: 'pointer',
              }} />
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Upload the fillable PDF. You can add or update field mappings after creation.
            </span>
          </div>

          {error && <div className="alert-error" style={{ marginBottom: '12px' }}>{error}</div>}

          <button type="submit" disabled={saving}
            className={saving ? 'btn btn-disabled btn-full' : 'btn btn-primary btn-full'}
            style={{ marginTop: '8px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Creating…' : 'Create Form'}
          </button>
        </form>
      </div>
    </main>
  )
}
