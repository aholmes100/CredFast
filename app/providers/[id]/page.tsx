import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase-server'
import type { Provider, EnrollmentWithPayer } from '../../types'
import ProviderEditor from '../../components/ProviderEditor'
import DeleteButton from '../../components/DeleteButton'
import DocumentList, { type ProviderDocument } from '../../components/DocumentList'
import ProviderLocationsTab from '../../components/tabs/ProviderLocationsTab'
import ProviderEnrollmentsTab from '../../components/tabs/ProviderEnrollmentsTab'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const VALID_TABS = ['overview', 'locations', 'enrollments', 'documents'] as const
type Tab = typeof VALID_TABS[number]

export default async function ProviderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const rawTab = (await searchParams).tab
  const tab: Tab = (VALID_TABS as readonly string[]).includes(rawTab ?? '')
    ? (rawTab as Tab)
    : 'overview'

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('organization_id').single()
  const orgId  = (profileData as { organization_id: string } | null)?.organization_id ?? ''
  const userId = user?.id ?? ''

  const [
    { data, error },
    { data: assignmentRows },
    { data: docRows },
    { data: licenseRows },
    { data: enrollmentRows },
    { data: allPayerRows },
  ] = await Promise.all([
    supabase.from('providers').select('*').eq('id', id).single(),
    supabase
      .from('provider_group_locations')
      .select(`id, is_primary, is_active, groups(id, name), locations(id, name, address_1, city, state)`)
      .eq('provider_id', id)
      .eq('is_active', true),
    supabase
      .from('documents')
      .select('id, name, type, file_path, file_size, mime_type, expiration_date, notes, created_at')
      .eq('provider_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('provider_licenses')
      .select('*')
      .eq('provider_id', id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('provider_payer_enrollments')
      .select('*, payers(id, name)')
      .eq('provider_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payers')
      .select('id, name')
      .order('name'),
  ])

  if (error || !data) notFound()

  const provider   = data as Provider
  const documents  = (docRows ?? []) as unknown as ProviderDocument[]
  const licenses   = (licenseRows ?? []) as unknown as LicenseRow[]
  const enrollments = (enrollmentRows ?? []) as unknown as EnrollmentWithPayer[]
  const allPayers  = (allPayerRows ?? []) as { id: string; name: string }[]

  type AssignmentRow = {
    id: string; is_primary: boolean; is_active: boolean
    groups: { id: string; name: string } | null
    locations: { id: string; name: string; address_1: string | null; city: string | null; state: string | null } | null
  }
  type LicenseRow = {
    id: string; state: string; license_number: string; license_type: string
    status: string; expiration_date: string | null; is_primary: boolean
  }

  const assignments = (assignmentRows ?? []) as unknown as AssignmentRow[]

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview' },
    { key: 'locations',    label: assignments.length  ? `Locations (${assignments.length})`    : 'Locations' },
    { key: 'enrollments',  label: enrollments.length  ? `Enrollments (${enrollments.length})`  : 'Enrollments' },
    { key: 'documents',    label: documents.length    ? `Documents (${documents.length})`      : 'Documents' },
  ]

  return (
    <main className="page-xl">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/providers" className="breadcrumb-link">Providers</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{provider.first_name} {provider.last_name}</span>
      </div>

      {/* Page header */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title">{provider.first_name} {provider.last_name}{provider.credential_suffix ? `, ${provider.credential_suffix}` : ''}</h1>
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

      {/* Tab bar */}
      <nav className="tab-nav" style={{ marginBottom: '24px' }}>
        {tabs.map(({ key, label }) => (
          <Link
            key={key}
            href={`?tab=${key}`}
            className={`tab-btn${tab === key ? ' tab-btn-active' : ''}`}
            style={{ textDecoration: 'none' }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Overview tab ───────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ maxWidth: '860px' }}>

          {/* Key Identifiers */}
          <div className="card-lg" style={{ marginBottom: '16px' }}>
            <p className="section-label">Key Identifiers</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '12px' }}>
              {[
                { label: 'NPI',           value: provider.npi },
                { label: 'CAQH',          value: provider.caqh_number },
                { label: 'DEA',           value: provider.dea_number },
                { label: 'Medicare PTAN', value: provider.medicare_number },
                { label: 'Medicaid #',    value: provider.medicaid_number },
                { label: 'License',       value: provider.license_number ? `${provider.license_number}${provider.license_state ? ` (${provider.license_state})` : ''}` : null },
                { label: 'Email',         value: provider.email },
                { label: 'Date of Birth', value: fmtDate(provider.date_of_birth) },
              ].map(({ label, value }) => (
                <dl key={label} className="data-item">
                  <dt>{label}</dt>
                  <dd style={{ color: value && value !== '—' ? '#0f172a' : '#94a3b8' }}>{value || '—'}</dd>
                </dl>
              ))}
            </div>
          </div>

          {/* Credential Status */}
          <div className="card-lg" style={{ marginBottom: '16px' }}>
            <p className="section-label">Credential Status</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Medical License',       date: provider.license_expiration,    detail: provider.license_number ? `${provider.license_number}${provider.license_state ? ` · ${provider.license_state}` : ''}` : null },
                { label: 'Malpractice Insurance', date: provider.malpractice_expiration, detail: provider.malpractice_carrier ?? null },
                { label: 'Board Certification',   date: provider.board_expiration,       detail: provider.board_specialty ?? null },
                { label: 'DEA Registration',      date: null,                            detail: provider.dea_number ?? null },
                { label: 'CAQH ProView',          date: null,                            detail: provider.caqh_number ?? null },
              ].map(({ label, date, detail }) => {
                const days = date ? Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) : null
                const expired  = days !== null && days < 0
                const soon     = days !== null && days >= 0 && days < 30
                const upcoming = days !== null && days >= 30 && days < 90
                const statusColor  = expired ? '#dc2626' : soon ? '#d97706' : upcoming ? '#b45309' : days !== null ? '#15803d' : '#94a3b8'
                const statusBg     = expired ? '#fef2f2' : soon ? '#fef2f2' : upcoming ? '#fffbeb' : days !== null ? '#f0fdf4' : '#f8fafc'
                const statusBorder = expired ? '#fecaca' : soon ? '#fecaca' : upcoming ? '#fde68a' : days !== null ? '#bbf7d0' : '#e2e8f0'
                const statusLabel  = expired ? '⚠ Expired' : soon ? `Expires in ${days}d` : upcoming ? `Exp. ${fmtDate(date)}` : date ? `Current · exp ${fmtDate(date)}` : detail ? 'On file' : '—'
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{label}</div>
                      {detail && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{detail}</div>}
                    </div>
                    <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 600, color: statusColor, backgroundColor: statusBg, border: `1px solid ${statusBorder}`, borderRadius: '5px', padding: '3px 8px' }}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* State Licenses */}
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
                        <span style={{ marginLeft: '8px', fontSize: '10px', color: '#4f46e5', backgroundColor: '#eef2ff', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Primary</span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{lic.license_type}</span>
                    {lic.expiration_date && (() => {
                      const days = Math.ceil((new Date(lic.expiration_date).getTime() - Date.now()) / 86400000)
                      const color = days < 0 ? '#dc2626' : days < 90 ? '#d97706' : '#15803d'
                      const bg    = days < 0 ? '#fef2f2' : days < 90 ? '#fffbeb' : '#f0fdf4'
                      const border= days < 0 ? '#fecaca' : days < 90 ? '#fde68a' : '#bbf7d0'
                      return (
                        <span style={{ fontSize: '11px', fontWeight: 600, color, backgroundColor: bg, border: `1px solid ${border}`, borderRadius: '4px', padding: '2px 6px' }}>
                          {days < 0 ? '⚠ Expired' : `exp ${fmtDate(lic.expiration_date)}`}
                        </span>
                      )
                    })()}
                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', backgroundColor: lic.status === 'active' ? '#f0fdf4' : '#fef2f2', color: lic.status === 'active' ? '#15803d' : '#b91c1c' }}>
                      {lic.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Editable provider fields */}
          <ProviderEditor provider={provider} />
        </div>
      )}

      {/* ── Locations tab ──────────────────────────────────────────── */}
      {tab === 'locations' && (
        <ProviderLocationsTab
          providerId={id}
          orgId={orgId}
          initialAssignments={assignments as AssignmentRow[]}
        />
      )}

      {/* ── Enrollments tab ────────────────────────────────────────── */}
      {tab === 'enrollments' && (
        <ProviderEnrollmentsTab
          providerId={id}
          orgId={orgId}
          initialEnrollments={enrollments}
          allPayers={allPayers}
        />
      )}

      {/* ── Documents tab ──────────────────────────────────────────── */}
      {tab === 'documents' && (
        <div style={{ maxWidth: '860px' }}>
          <div className="card-lg">
            <p className="section-label">Documents</p>
            <DocumentList
              providerId={provider.id}
              orgId={orgId}
              userId={userId}
              initialDocuments={documents}
            />
          </div>
        </div>
      )}
    </main>
  )
}
