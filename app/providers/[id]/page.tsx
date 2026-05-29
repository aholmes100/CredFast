import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase-server'
import type { Provider } from '../../types'
import ProviderEditor from '../../components/ProviderEditor'
import DeleteButton from '../../components/DeleteButton'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function expirationBadge(dateStr: string | null | undefined, label: string) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000)
  const expired = days < 0
  const soon    = days >= 0 && days < 90
  const color   = expired ? '#dc2626' : soon ? '#d97706' : '#15803d'
  const bg      = expired ? '#fef2f2' : soon ? '#fffbeb' : '#f0fdf4'
  const border  = expired ? '#fecaca' : soon ? '#fde68a' : '#bbf7d0'
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, color, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '2px 6px' }}>
      {expired ? '⚠ Expired' : `${label} exp ${fmtDate(dateStr)}`}
    </span>
  )
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data, error },
    { data: assignmentRows },
    { data: appRows },
    { data: docRows },
    { data: licenseRows },
  ] = await Promise.all([
    supabase.from('providers').select('*').eq('id', id).single(),
    supabase
      .from('provider_group_locations')
      .select(`
        id, is_primary, is_active,
        groups(id, name),
        locations(id, name, address_1, city, state)
      `)
      .eq('provider_id', id)
      .eq('is_active', true),
    supabase
      .from('enrollment_applications')
      .select(`*, payers(name), groups(name)`)
      .eq('provider_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    // documents table may not exist yet — handle gracefully
    supabase
      .from('documents')
      .select('*')
      .eq('entity_type', 'provider')
      .eq('entity_id', id)
      .eq('is_current', true)
      .order('uploaded_at', { ascending: false }),
    // provider_licenses may not exist yet — handle gracefully
    supabase
      .from('provider_licenses')
      .select('*')
      .eq('provider_id', id)
      .order('is_primary', { ascending: false }),
  ])

  if (error || !data) notFound()

  const provider = data as Provider

  type AssignmentRow = {
    id: string
    is_primary: boolean
    is_active: boolean
    groups: { id: string; name: string } | null
    locations: { id: string; name: string; address_1: string | null; city: string | null; state: string | null } | null
  }
  type AppRow = {
    id: string; status: string; created_at: string; submitted_at: string | null
    payers: { name: string } | null; groups: { name: string } | null
  }
  type DocRow = {
    id: string; document_type: string; label: string | null; file_name: string
    storage_path: string; expiration_date: string | null; uploaded_at: string; uploaded_by: string | null
  }
  type LicenseRow = {
    id: string; state: string; license_number: string; license_type: string
    status: string; expiration_date: string | null; is_primary: boolean
  }

  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[]
  const apps        = (appRows ?? []) as unknown as AppRow[]
  const documents   = (docRows ?? []) as unknown as DocRow[]
  const licenses    = (licenseRows ?? []) as unknown as LicenseRow[]

  const appStatusColors: Record<string, string> = {
    draft: '#64748b', ready: '#1d4ed8', submitted: '#b45309', approved: '#15803d',
  }

  // Build signed URLs for documents
  const docsWithUrls = await Promise.all(
    documents.map(async (doc) => {
      const { data: urlData } = await supabase.storage
        .from('credfast-documents')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signedUrl: urlData?.signedUrl ?? null }
    })
  )

  return (
    <main className="page-xl">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/providers" className="breadcrumb-link">Providers</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{provider.first_name} {provider.last_name}</span>
      </div>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{provider.first_name} {provider.last_name}</h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {provider.npi && <span className="pill">NPI {provider.npi}</span>}
            {provider.specialty && <span className="pill">{provider.specialty}</span>}
            {provider.taxonomy_code && <span className="pill">{provider.taxonomy_code}</span>}
            {provider.accepting_new_patients === false && (
              <span className="pill" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>Closed Panel</span>
            )}
            {provider.accepting_new_patients === true && (
              <span className="pill" style={{ backgroundColor: '#f0fdf4', color: '#15803d' }}>Accepting Patients</span>
            )}
          </div>
        </div>
        <DeleteButton table="providers" id={provider.id} label="Delete Provider" redirectTo="/providers" />
      </div>

      {/* ── At-a-glance identifiers ──────────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '16px' }}>
        <p className="section-label">Key Identifiers</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '12px' }}>
          {[
            { label: 'NPI',            value: provider.npi },
            { label: 'CAQH',           value: provider.caqh_number },
            { label: 'DEA',            value: provider.dea_number },
            { label: 'Medicare PTAN',  value: provider.medicare_number },
            { label: 'Medicaid #',     value: provider.medicaid_number },
            { label: 'License',        value: provider.license_number ? `${provider.license_number}${provider.license_state ? ` (${provider.license_state})` : ''}` : null },
            { label: 'Email',          value: provider.email },
            { label: 'Date of Birth',  value: fmtDate(provider.date_of_birth) },
          ].map(({ label, value }) => (
            <dl key={label} className="data-item">
              <dt>{label}</dt>
              <dd style={{ color: value && value !== '—' ? '#0f172a' : '#94a3b8' }}>{value || '—'}</dd>
            </dl>
          ))}
        </div>

        {/* Expiration alerts */}
        {(provider.license_expiration || provider.malpractice_expiration || provider.board_expiration) && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            {expirationBadge(provider.license_expiration, 'License')}
            {expirationBadge(provider.malpractice_expiration, 'Malpractice')}
            {expirationBadge(provider.board_expiration, 'Board cert')}
          </div>
        )}
      </div>

      {/* ── Licenses (from provider_licenses table if migrated) ──────── */}
      {licenses.length > 0 && (
        <div className="card-lg" style={{ marginBottom: '16px' }}>
          <p className="section-label">State Licenses</p>
          <div className="row-list">
            {licenses.map((lic) => (
              <div key={lic.id} className="row-list-item">
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                    {lic.state} — {lic.license_number}
                  </span>
                  {lic.is_primary && (
                    <span style={{ marginLeft: '8px', fontSize: '10px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                      Primary
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{lic.license_type}</span>
                {lic.expiration_date && expirationBadge(lic.expiration_date, `${lic.state} exp`)}
                <span style={{
                  fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px',
                  backgroundColor: lic.status === 'active' ? '#f0fdf4' : '#fef2f2',
                  color: lic.status === 'active' ? '#15803d' : '#b91c1c',
                }}>
                  {lic.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Two-column: editor + sidebar ──────────────────────────────── */}
      <div className="layout-two-col" style={{ marginBottom: '16px' }}>

        {/* Main: editable form */}
        <div>
          <ProviderEditor provider={provider} />
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Assignments */}
          <div className="card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p className="section-label" style={{ margin: 0 }}>Assignments</p>
              <Link href="/assignments/new" style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none' }}>+ Add</Link>
            </div>
            {assignments.length ? (
              <div className="row-list">
                {assignments.map((a) => (
                  <div key={a.id} className="row-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', flex: 1 }}>
                        {a.groups?.name || '—'}
                      </span>
                      {a.is_primary && (
                        <span style={{ fontSize: '10px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>
                          Primary
                        </span>
                      )}
                    </div>
                    {a.locations && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {a.locations.name}
                        {a.locations.city && ` · ${a.locations.city}, ${a.locations.state}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                No assignments. <Link href="/assignments/new" style={{ color: '#4f46e5' }}>Create one</Link>
              </div>
            )}
          </div>

          {/* Recent applications */}
          <div className="card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p className="section-label" style={{ margin: 0 }}>Applications</p>
              <Link href="/applications/new" style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none' }}>+ New</Link>
            </div>
            {apps.length ? (
              <div className="row-list">
                {apps.map((a) => (
                  <Link key={a.id} href={`/applications/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="row-list-item" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>
                          {a.payers?.name || '—'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{a.groups?.name || '—'}</div>
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, padding: '2px 7px', borderRadius: '9999px',
                        color: appStatusColors[a.status] ?? '#64748b',
                        backgroundColor: '#f8fafc',
                        textTransform: 'capitalize',
                      }}>
                        {a.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No applications yet.</div>
            )}
          </div>

          {/* Documents */}
          <div className="card-lg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p className="section-label" style={{ margin: 0 }}>Documents</p>
              <Link href="/documents" style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none' }}>View all</Link>
            </div>
            {docsWithUrls.length ? (
              <div className="row-list">
                {docsWithUrls.slice(0, 8).map((doc) => (
                  <div key={doc.id} className="row-list-item" style={{ justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.label || doc.file_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {doc.document_type.replace(/_/g, ' ')}
                        {doc.expiration_date ? ` · exp ${fmtDate(doc.expiration_date)}` : ''}
                      </div>
                    </div>
                    {doc.signedUrl && (
                      <a href={doc.signedUrl} download style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none', flexShrink: 0 }}>
                        ↓
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>No documents on file.</div>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}
