import Link from 'next/link'
import { createClient } from '../lib/supabase-server'

type EntityType = 'provider' | 'group' | 'location' | 'payer' | 'application'

interface DocumentRow {
  id: string
  entity_type: EntityType
  entity_id: string
  document_type: string
  label: string | null
  file_name: string
  storage_path: string
  expiration_date: string | null
  effective_date: string | null
  is_current: boolean
  requires_renewal: boolean
  uploaded_at: string
  uploaded_by: string | null
  notes: string | null
}

const ENTITY_COLORS: Record<EntityType, { bg: string; color: string }> = {
  provider:    { bg: '#eff6ff', color: '#1d4ed8' },
  group:       { bg: '#f0fdf4', color: '#15803d' },
  location:    { bg: '#fdf4ff', color: '#7e22ce' },
  payer:       { bg: '#fff7ed', color: '#c2410c' },
  application: { bg: '#fffbeb', color: '#b45309' },
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function expirationStyle(dateStr: string | null | undefined): { color: string; fontWeight: number } {
  if (!dateStr) return { color: '#94a3b8', fontWeight: 400 }
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  if (days < 0)   return { color: '#dc2626', fontWeight: 700 }
  if (days < 90)  return { color: '#d97706', fontWeight: 600 }
  return { color: '#16a34a', fontWeight: 400 }
}

export default async function DocumentsPage() {
  const supabase = await createClient()
  // Query documents table — may not exist if Phase 2 migration hasn't been run
  const { data: rows, error } = await supabase
    .from('documents')
    .select('*')
    .eq('is_current', true)
    .order('uploaded_at', { ascending: false })

  // Also pull provider_documents (Phase 1) for backwards compat
  const { data: provDocs } = await supabase
    .from('provider_documents')
    .select('*')
    .eq('is_current', true)
    .order('uploaded_at', { ascending: false })

  const tableExists = !error || !error.message?.includes('does not exist')
  const documents = tableExists ? ((rows ?? []) as DocumentRow[]) : []

  // Merge provider_documents (Phase 1) if no unified documents yet
  const legacyDocs = ((provDocs ?? []) as {
    id: string; provider_id: string; document_type: string; label: string | null
    file_name: string; storage_path: string; expiration_date: string | null
    is_current: boolean; uploaded_at: string; uploaded_by: string | null; notes: string | null
  }[]).map(d => ({
    id: d.id,
    entity_type: 'provider' as EntityType,
    entity_id: d.provider_id,
    document_type: d.document_type,
    label: d.label,
    file_name: d.file_name,
    storage_path: d.storage_path,
    expiration_date: d.expiration_date,
    effective_date: null,
    is_current: d.is_current,
    requires_renewal: false,
    uploaded_at: d.uploaded_at,
    uploaded_by: d.uploaded_by,
    notes: d.notes,
  }))

  const allDocs = documents.length > 0 ? documents : legacyDocs

  // Counts by type
  const byEntity = allDocs.reduce((acc, d) => {
    acc[d.entity_type] = (acc[d.entity_type] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // eslint-disable-next-line react-hooks/purity
  const NOW = Date.now()
  const expiringCount = allDocs.filter(d => {
    if (!d.expiration_date) return false
    const days = Math.ceil((new Date(d.expiration_date).getTime() - NOW) / 86400000)
    return days >= 0 && days < 90
  }).length

  const expiredCount = allDocs.filter(d => {
    if (!d.expiration_date) return false
    return new Date(d.expiration_date) < new Date()
  }).length

  return (
    <main className="page-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">
            {allDocs.length} document{allDocs.length !== 1 ? 's' : ''} on file
            {expiredCount > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> · {expiredCount} expired</span>}
            {expiringCount > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}> · {expiringCount} expiring soon</span>}
          </p>
        </div>
      </div>

      {/* Summary by entity type */}
      {allDocs.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {(Object.entries(byEntity) as [EntityType, number][]).map(([type, count]) => {
            const clr = ENTITY_COLORS[type] ?? { bg: '#f1f5f9', color: '#64748b' }
            return (
              <span key={type} style={{
                padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 600,
                backgroundColor: clr.bg, color: clr.color,
              }}>
                {count} {type}
              </span>
            )
          })}
        </div>
      )}

      {/* No migration message */}
      {!tableExists && legacyDocs.length === 0 && (
        <div className="card-lg" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '24px', marginBottom: '12px' }}>📁</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Documents table not yet set up</div>
          <div style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
            Run the Phase 2 schema migration to enable document storage. Once migrated, you can attach files to providers, groups, locations, payers, and applications.
          </div>
        </div>
      )}

      {/* Document list */}
      {allDocs.length > 0 && (
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 160px 140px 120px 120px',
            padding: '10px 16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            {['Entity', 'File / Label', 'Type', 'Uploaded', 'Expiration', 'By'].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                {h}
              </span>
            ))}
          </div>

          {allDocs.map((doc, idx) => {
            const clr = ENTITY_COLORS[doc.entity_type] ?? { bg: '#f1f5f9', color: '#64748b' }
            const expStyle = expirationStyle(doc.expiration_date)
            const isExpired = doc.expiration_date && new Date(doc.expiration_date) < new Date()
            return (
              <div
                key={doc.id}
                className={isExpired ? 'table-row-expired' : 'table-row-hover'}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 160px 140px 120px 120px',
                  padding: '11px 16px',
                  borderBottom: idx < allDocs.length - 1 ? '1px solid #f1f5f9' : 'none',
                  alignItems: 'center',
                }}
              >
                {/* Entity badge */}
                <span style={{
                  fontSize: '10px', fontWeight: 600, textTransform: 'capitalize',
                  backgroundColor: clr.bg, color: clr.color,
                  padding: '2px 7px', borderRadius: '4px', display: 'inline-block',
                }}>
                  {doc.entity_type}
                </span>

                {/* File name / label */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.label || doc.file_name}
                  </div>
                  {doc.label && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.file_name}
                    </div>
                  )}
                  {doc.notes && (
                    <div style={{ fontSize: '11px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.notes}
                    </div>
                  )}
                </div>

                {/* Document type */}
                <span style={{ fontSize: '11px', color: '#475569' }}>
                  {doc.document_type.replace(/_/g, ' ')}
                </span>

                {/* Uploaded date */}
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {fmtDate(doc.uploaded_at)}
                </span>

                {/* Expiration */}
                <span style={{ fontSize: '11px', ...expStyle }}>
                  {doc.expiration_date ? fmtDate(doc.expiration_date) : '—'}
                  {isExpired && ' ⚠'}
                </span>

                {/* Uploaded by */}
                <span style={{ fontSize: '11px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.uploaded_by || '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {allDocs.length === 0 && tableExists && (
        <div className="empty-state">
          No documents on file yet.
          <br />
          <span style={{ fontSize: '12px', display: 'block', marginTop: '8px' }}>
            Documents can be attached to providers, groups, locations, payers, and applications once uploaded.
          </span>
        </div>
      )}

      {/* Quick links */}
      <div style={{ marginTop: '24px', padding: '16px 20px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
        <p className="section-label">Add Documents To</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { href: '/providers', label: 'Providers' },
            { href: '/groups', label: 'Groups' },
            { href: '/locations', label: 'Locations' },
            { href: '/applications', label: 'Applications' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} className="btn btn-secondary btn-sm">
              {label} →
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
