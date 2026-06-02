'use client'

import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ProviderDocument } from './DocumentList'

const DOC_TYPES = [
  { value: 'license',     label: 'License' },
  { value: 'malpractice', label: 'Malpractice Insurance' },
  { value: 'dea',         label: 'DEA Certificate' },
  { value: 'board_cert',  label: 'Board Certification' },
  { value: 'caqh',        label: 'CAQH' },
  { value: 'other',       label: 'Other' },
]

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

interface Props {
  providerId: string
  orgId: string
  userId: string
  onUploadComplete: (doc: ProviderDocument) => void
  onCancel: () => void
}

export default function DocumentUploader({ providerId, orgId, userId, onUploadComplete, onCancel }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file,           setFile]           = useState<File | null>(null)
  const [docType,        setDocType]        = useState('license')
  const [docName,        setDocName]        = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [notes,          setNotes]          = useState('')
  const [uploading,      setUploading]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !docName) setDocName(f.name.replace(/\.[^.]+$/, ''))
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) { setError('Please select a file.'); return }
    if (!ACCEPTED_TYPES.includes(file.type)) { setError('Accepted formats: PDF, JPG, PNG, HEIC.'); return }
    if (file.size > MAX_BYTES) { setError('File must be under 10 MB.'); return }
    if (!docName.trim()) { setError('Please enter a document name.'); return }

    setUploading(true)
    setError(null)

    const ext      = file.name.includes('.') ? file.name.split('.').pop() : ''
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const filePath = `${orgId}/${providerId}/${uniqueId}-${sanitize(file.name)}`

    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { contentType: file.type })

    if (storageError) {
      setError(storageError.message)
      setUploading(false)
      return
    }

    const { data: inserted, error: dbError } = await supabase
      .from('documents')
      .insert({
        organization_id: orgId,
        provider_id:     providerId,
        name:            docName.trim(),
        type:            docType,
        file_path:       filePath,
        file_size:       file.size,
        mime_type:       file.type,
        expiration_date: expirationDate || null,
        notes:           notes.trim() || null,
        uploaded_by:     userId,
      })
      .select('*')
      .single()

    setUploading(false)

    if (dbError || !inserted) {
      // Clean up storage if DB insert failed
      await supabase.storage.from('documents').remove([filePath])
      setError(dbError?.message ?? 'Failed to save document record.')
      return
    }

    onUploadComplete(inserted as ProviderDocument)
    void ext // suppress unused var lint
  }

  return (
    <div style={{
      padding: '16px', backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0', borderRadius: '10px', marginTop: '12px',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginBottom: '14px' }}>
        Upload Document
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* File picker */}
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              padding: '12px 16px', border: '1.5px dashed #cbd5e1', borderRadius: '8px',
              cursor: 'pointer', textAlign: 'center', backgroundColor: '#fff',
              fontSize: '13px', color: file ? '#0f172a' : '#94a3b8',
            }}
          >
            {file ? file.name : 'Click to choose a file (PDF, JPG, PNG, HEIC — max 10 MB)'}
          </div>
          <input
            ref={fileRef} type="file" style={{ display: 'none' }}
            accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
            onChange={handleFileChange}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Document type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Document Type</label>
            <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Document name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Document Name</label>
            <input
              className="form-input"
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="e.g. Ohio Medical License 2025"
            />
          </div>

          {/* Expiration date */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Expiration Date (optional)</label>
            <input
              className="form-input" type="date"
              value={expirationDate} onChange={e => setExpirationDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Notes (optional)</label>
            <input
              className="form-input" value={notes}
              onChange={e => setNotes(e.target.value)} placeholder="e.g. Renewal pending"
            />
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleUpload} disabled={uploading || !file} className="btn btn-primary">
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <button onClick={onCancel} disabled={uploading} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
