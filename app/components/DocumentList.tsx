'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import DocumentUploader from './DocumentUploader'

export interface ProviderDocument {
  id: string
  name: string
  type: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  expiration_date: string | null
  notes: string | null
  created_at: string
}

interface Props {
  providerId: string
  orgId: string
  userId: string
  initialDocuments: ProviderDocument[]
}

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  license:     { label: 'License',      color: '#1d4ed8', bg: '#eff6ff' },
  malpractice: { label: 'Malpractice',  color: '#7e22ce', bg: '#fdf4ff' },
  dea:         { label: 'DEA',          color: '#15803d', bg: '#f0fdf4' },
  board_cert:  { label: 'Board Cert',   color: '#b45309', bg: '#fffbeb' },
  caqh:        { label: 'CAQH',         color: '#0f766e', bg: '#f0fdfa' },
  other:       { label: 'Other',        color: '#64748b', bg: '#f1f5f9' },
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024)    return `${bytes} B`
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

function expirationStyle(dateStr: string | null): { color: string; fontWeight: number } | null {
  if (!dateStr) return null
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (days < 0)  return { color: '#dc2626', fontWeight: 700 }
  if (days < 90) return { color: '#d97706', fontWeight: 600 }
  return { color: '#16a34a', fontWeight: 400 }
}

export default function DocumentList({ providerId, orgId, userId, initialDocuments }: Props) {
  const [docs,        setDocs]        = useState<ProviderDocument[]>(initialDocuments)
  const [showForm,    setShowForm]    = useState(false)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleUploadComplete = (doc: ProviderDocument) => {
    setDocs(prev => [doc, ...prev])
    setShowForm(false)
  }

  const handleDownload = async (doc: ProviderDocument) => {
    setDownloadingId(doc.id)
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600)
    setDownloadingId(null)
    if (error || !data?.signedUrl) return
    window.open(data.signedUrl, '_blank')
  }

  const handleDelete = async (doc: ProviderDocument) => {
    if (!window.confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    setDeleteError(null)

    const [storageResult, dbResult] = await Promise.all([
      supabase.storage.from('documents').remove([doc.file_path]),
      supabase.from('documents').delete().eq('id', doc.id),
    ])

    setDeletingId(null)
    if (dbResult.error) { setDeleteError('Failed to delete. Please try again.'); return }
    if (storageResult.error) { /* file may already be gone — still remove from list */ }
    setDocs(prev => prev.filter(d => d.id !== doc.id))
  }

  return (
    <div>
      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </span>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
            + Upload Document
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && (
        <DocumentUploader
          providerId={providerId}
          orgId={orgId}
          userId={userId}
          onUploadComplete={handleUploadComplete}
          onCancel={() => setShowForm(false)}
        />
      )}

      {deleteError && (
        <div style={{ margin: '8px 0', padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#b91c1c' }}>
          {deleteError}
        </div>
      )}

      {/* Document list */}
      {docs.length === 0 && !showForm ? (
        <div style={{ padding: '32px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>No documents uploaded yet.</div>
          <button onClick={() => setShowForm(true)} className="btn btn-secondary btn-sm">
            Upload the first document
          </button>
        </div>
      ) : docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: showForm ? '12px' : 0 }}>
          {docs.map(doc => {
            const typeInfo  = TYPE_LABELS[doc.type] ?? TYPE_LABELS.other
            const expStyle  = expirationStyle(doc.expiration_date)
            const isDeleting  = deletingId === doc.id
            const isDownloading = downloadingId === doc.id

            return (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 14px', backgroundColor: '#fff',
                border: '1px solid #e2e8f0', borderRadius: '8px',
                flexWrap: 'wrap',
              }}>
                {/* Type badge */}
                <span style={{
                  flexShrink: 0, fontSize: '10px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: '4px',
                  color: typeInfo.color, backgroundColor: typeInfo.bg,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {typeInfo.label}
                </span>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: '140px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{doc.name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span>{fmtSize(doc.file_size)}</span>
                    {doc.expiration_date && (
                      <span style={expStyle ?? {}}>
                        Exp. {fmtDate(doc.expiration_date)}
                      </span>
                    )}
                    {doc.notes && <span>{doc.notes}</span>}
                    <span>Uploaded {fmtDate(doc.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px' }}
                  >
                    {isDownloading ? '…' : '↓ Download'}
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={isDeleting}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', color: '#dc2626' }}
                  >
                    {isDeleting ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
