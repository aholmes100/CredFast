import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import EmptyState from '../components/EmptyState'
import DownloadDocumentButton from '../components/DownloadDocumentButton'

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  license:     { label: 'License',     color: '#1d4ed8', bg: '#eff6ff' },
  malpractice: { label: 'Malpractice', color: '#7e22ce', bg: '#fdf4ff' },
  dea:         { label: 'DEA',         color: '#15803d', bg: '#f0fdf4' },
  board_cert:  { label: 'Board Cert',  color: '#b45309', bg: '#fffbeb' },
  caqh:        { label: 'CAQH',        color: '#0f766e', bg: '#f0fdfa' },
  other:       { label: 'Other',       color: '#64748b', bg: '#f1f5f9' },
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function expirationStyle(dateStr: string | null): React.CSSProperties {
  if (!dateStr) return { color: '#94a3b8' }
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (days < 0)  return { color: '#dc2626', fontWeight: 700 }
  if (days < 90) return { color: '#d97706', fontWeight: 600 }
  return { color: '#16a34a' }
}

interface DocRow {
  id: string
  name: string
  type: string
  file_path: string
  file_size: number | null
  expiration_date: string | null
  created_at: string
  providers: { id: string; first_name: string; last_name: string } | null
}

export default async function DocumentsPage() {
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from('documents')
    .select('id, name, type, file_path, file_size, expiration_date, created_at, providers(id, first_name, last_name)')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading documents.</div>
      </main>
    )
  }

  const docs = (rows ?? []) as unknown as DocRow[]

  // Group by provider
  const providerMap = new Map<string, { providerId: string; providerName: string; docs: DocRow[] }>()
  for (const doc of docs) {
    const pid  = doc.providers?.id ?? 'unknown'
    const name = doc.providers ? `${doc.providers.first_name} ${doc.providers.last_name}` : 'Unknown Provider'
    if (!providerMap.has(pid)) providerMap.set(pid, { providerId: pid, providerName: name, docs: [] })
    providerMap.get(pid)!.docs.push(doc)
  }
  const grouped = Array.from(providerMap.values())

  return (
    <main className="page-xl">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            {docs.length} document{docs.length !== 1 ? 's' : ''} across {grouped.length} provider{grouped.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon="🗂️"
          headline="No documents yet"
          context="Upload licenses, malpractice certificates, DEA certificates, and other credentials from a provider's detail page."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {grouped.map(({ providerId, providerName, docs: provDocs }) => (
            <div key={providerId} className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Provider header */}
              <div style={{
                padding: '10px 16px', backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <Link href={`/providers/${providerId}`} style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', textDecoration: 'none' }}>
                  {providerName}
                </Link>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {provDocs.length} document{provDocs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Document rows */}
              {provDocs.map((doc, i) => {
                const typeInfo = TYPE_LABELS[doc.type] ?? TYPE_LABELS.other
                return (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 16px', flexWrap: 'wrap',
                      borderBottom: i < provDocs.length - 1 ? '1px solid #f1f5f9' : 'none',
                    }}
                  >
                    <span style={{
                      flexShrink: 0, fontSize: '10px', fontWeight: 700,
                      padding: '2px 8px', borderRadius: '4px',
                      color: typeInfo.color, backgroundColor: typeInfo.bg,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {typeInfo.label}
                    </span>

                    <div style={{ flex: 1, minWidth: '140px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{doc.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                        Uploaded {fmtDate(doc.created_at)}
                      </div>
                    </div>

                    {doc.expiration_date && (
                      <span style={{ fontSize: '12px', ...expirationStyle(doc.expiration_date), flexShrink: 0 }}>
                        Exp. {fmtDate(doc.expiration_date)}
                      </span>
                    )}

                    <DownloadDocumentButton filePath={doc.file_path} label="↓ Download" />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
