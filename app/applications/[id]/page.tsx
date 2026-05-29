import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase-server'
import type { PayerFormWithPayer } from '../../types'
import StatusUpdater from '../../components/StatusUpdater'
import LocationEditor from '../../components/LocationEditor'
import GeneratePdfButton from '../../components/GeneratePdfButton'
import ValidationPanel from '../../components/ValidationPanel'
import DeleteButton from '../../components/DeleteButton'
import WorkflowPanel from '../../components/WorkflowPanel'
import WorkflowFields from '../../components/WorkflowFields'

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // ── Fetch application with full provider, group, payer detail ─────────────
  const { data: application, error } = await supabase
    .from('enrollment_applications')
    .select(`
      *,
      providers(id, first_name, last_name, npi, specialty, email, license_number, license_state, caqh_number, malpractice_carrier, malpractice_expiration),
      groups(id, name, legal_name, tax_id, group_npi, authorized_official_name),
      payers(id, name, payer_id_code, enrollment_phone, processing_days, enrollment_address)
    `)
    .eq('id', id)
    .single()

  if (error || !application) notFound()

  const app = application as unknown as {
    id: string
    status: string
    location_mode: string
    provider_id: string
    group_id: string
    payer_id: string
    created_at: string
    submitted_at: string | null
    approved_at: string | null
    effective_date: string | null
    payer_reference: string | null
    notes: string | null
    application_type: string | null
    payer_provider_id: string | null
    renewal_date: string | null
    assigned_to: string | null
    follow_up_date: string | null
    denial_reason: string | null
    priority: string
    next_action: string | null
    providers: {
      id: string; first_name: string; last_name: string; npi: string | null
      specialty: string | null; email: string | null; license_number: string | null
      license_state: string | null; caqh_number: string | null
      malpractice_carrier: string | null; malpractice_expiration: string | null
    } | null
    groups: {
      id: string; name: string; legal_name: string | null; tax_id: string | null
      group_npi: string | null; authorized_official_name: string | null
    } | null
    payers: {
      id: string; name: string; payer_id_code: string | null
      enrollment_phone: string | null; processing_days: number | null
      enrollment_address: string | null
    } | null
  }

  // ── Fetch locations, payer forms, generated docs ────────────────────────
  const [{ data: locationRows }, { data: payerFormRows }, { data: generatedDocs }] = await Promise.all([
    supabase
      .from('enrollment_application_locations')
      .select(`locations(id, name, address_1, city, state, zip)`)
      .eq('enrollment_application_id', id),
    supabase
      .from('payer_forms')
      .select(`*, payers(name)`)
      .eq('payer_id', app.payer_id)
      .eq('is_active', true),
    supabase
      .from('application_documents')
      .select(`*, payer_forms(name)`)
      .eq('enrollment_application_id', id)
      .order('generated_at', { ascending: false }),
  ])

  const initialLocationIds = (locationRows as unknown as { locations: { id: string } | null }[])
    ?.map(r => r.locations?.id)
    .filter((lid): lid is string => typeof lid === 'string') ?? []

  const payerForms = (payerFormRows ?? []) as unknown as PayerFormWithPayer[]

  const docs = (generatedDocs ?? []) as unknown as {
    id: string; generated_at: string; generated_by: string | null
    storage_path: string; is_final?: boolean; sent_at?: string | null
    sent_method?: string | null; generation_status?: string
    payer_forms: { name: string } | null
  }[]

  // Generate signed download URLs for each generated doc
  const docsWithUrls = await Promise.all(
    docs.map(async (doc) => {
      const { data } = await supabase.storage
        .from('application-documents')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signedUrl: data?.signedUrl ?? null }
    })
  )

  const providerName = app.providers
    ? `${app.providers.first_name} ${app.providers.last_name}`
    : 'Unknown Provider'

  const statusColors: Record<string, { bg: string; color: string; border: string }> = {
    draft:     { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
    ready:     { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    submitted: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
    approved:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  }
  const sc = statusColors[app.status] ?? statusColors.draft

  return (
    <main className="page-xl">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/applications" className="breadcrumb-link">Applications</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{providerName}</span>
      </div>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{providerName}</h1>
            <span style={{
              padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
              backgroundColor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`,
              textTransform: 'capitalize',
            }}>
              {app.status}
            </span>
            {app.application_type && (
              <span className="pill">{app.application_type.replace(/_/g, ' ')}</span>
            )}
            {app.assigned_to && (
              <span className="pill">→ {app.assigned_to}</span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>
            {app.payers?.name || 'Unknown Payer'} · Enrollment Application
          </p>
        </div>
        <DeleteButton table="enrollment_applications" id={id} label="Delete" redirectTo="/applications" />
      </div>

      {/* ── Entity summary cards ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {/* Provider card */}
        <div className="entity-card">
          <div className="entity-card-label">Provider</div>
          <div className="entity-card-name">
            <Link href={app.providers ? `/providers/${app.providers.id}` : '#'} style={{ color: 'inherit', textDecoration: 'none' }}>
              {providerName}
            </Link>
          </div>
          <div className="entity-card-meta">
            {app.providers?.npi && <span>NPI <strong>{app.providers.npi}</strong></span>}
            {app.providers?.specialty && <span><strong>{app.providers.specialty}</strong></span>}
            {app.providers?.license_number && (
              <span>
                License <strong>{app.providers.license_number}</strong>
                {app.providers.license_state && ` (${app.providers.license_state})`}
              </span>
            )}
            {app.providers?.caqh_number && <span>CAQH <strong>{app.providers.caqh_number}</strong></span>}
            {app.providers?.malpractice_carrier && (
              <span>
                Malpractice <strong>{app.providers.malpractice_carrier}</strong>
                {app.providers.malpractice_expiration && ` · exp ${fmtDate(app.providers.malpractice_expiration)}`}
              </span>
            )}
          </div>
        </div>

        {/* Group card */}
        <div className="entity-card">
          <div className="entity-card-label">Group</div>
          <div className="entity-card-name">
            <Link href={app.groups ? `/groups/${app.groups.id}` : '#'} style={{ color: 'inherit', textDecoration: 'none' }}>
              {app.groups?.name || '—'}
            </Link>
          </div>
          <div className="entity-card-meta">
            {app.groups?.legal_name && <span>{app.groups.legal_name}</span>}
            {app.groups?.tax_id && <span>EIN <strong>{app.groups.tax_id}</strong></span>}
            {app.groups?.group_npi && <span>Group NPI <strong>{app.groups.group_npi}</strong></span>}
            {app.groups?.authorized_official_name && (
              <span>Auth. Official <strong>{app.groups.authorized_official_name}</strong></span>
            )}
          </div>
        </div>

        {/* Payer card */}
        <div className="entity-card">
          <div className="entity-card-label">Payer</div>
          <div className="entity-card-name">{app.payers?.name || '—'}</div>
          <div className="entity-card-meta">
            {app.payers?.payer_id_code && <span>Payer ID <strong>{app.payers.payer_id_code}</strong></span>}
            {app.payers?.processing_days && (
              <span>Typical processing <strong>{app.payers.processing_days} days</strong></span>
            )}
            {app.payers?.enrollment_phone && <span>Phone <strong>{app.payers.enrollment_phone}</strong></span>}
            {app.payers?.enrollment_address && <span>{app.payers.enrollment_address}</span>}
            {payerForms.length > 0 && (
              <span>{payerForms.length} enrollment form{payerForms.length !== 1 ? 's' : ''} available</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column body ─────────────────────────────────────────── */}
      <div className="layout-two-col">

        {/* ── Main column ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Status */}
          <div className="card-lg">
            <p className="section-label">Status</p>
            <StatusUpdater applicationId={id} currentStatus={app.status as 'draft' | 'ready' | 'submitted' | 'approved'} />
          </div>

          {/* Locations */}
          <div className="card-lg">
            <p className="section-label">Service Locations</p>
            <LocationEditor
              applicationId={id}
              providerId={app.provider_id}
              groupId={app.group_id}
              initialLocationMode={app.location_mode as 'all' | 'selected'}
              initialLocationIds={initialLocationIds}
            />
          </div>

          {/* Generated PDFs */}
          <div className="card-lg">
            <p className="section-label">Enrollment Documents</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>
              Auto-fill a payer enrollment form with this application&apos;s data.
            </p>
            <GeneratePdfButton applicationId={id} payerForms={payerForms} />

            {/* Previously generated docs */}
            {docsWithUrls.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '8px' }}>
                  Generated History
                </p>
                <div className="row-list">
                  {docsWithUrls.map((doc) => (
                    <div key={doc.id} className="row-list-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                          {doc.payer_forms?.name ?? 'Enrollment Form'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                          Generated {fmtDate(doc.generated_at)}
                          {doc.generated_by ? ` · ${doc.generated_by}` : ''}
                          {doc.sent_at ? ` · Sent ${fmtDate(doc.sent_at)} via ${doc.sent_method ?? '?'}` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        {doc.is_final && (
                          <span style={{ fontSize: '10px', fontWeight: 600, color: '#15803d', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '2px 6px' }}>
                            Final
                          </span>
                        )}
                        {doc.generation_status === 'failed' && (
                          <span style={{ fontSize: '10px', color: '#dc2626' }}>Failed</span>
                        )}
                        {doc.signedUrl ? (
                          <a
                            href={doc.signedUrl}
                            download
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 10px' }}
                          >
                            ↓ Download
                          </a>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Unavailable</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workflow: tasks, notes, follow-up */}
          <div className="card-lg">
            <p className="section-label">Workflow</p>
            <WorkflowPanel applicationId={id} />
          </div>
        </div>

        {/* ── Sidebar column ──────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Application details */}
          <div className="card-lg">
            <p className="section-label">Application Details</p>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Type',         value: app.application_type ? app.application_type.replace(/_/g, ' ') : 'Initial' },
                { label: 'Created',      value: fmtDate(app.created_at) },
                { label: 'Submitted',    value: fmtDate(app.submitted_at) },
                { label: 'Approved',     value: fmtDate(app.approved_at) },
                { label: 'Effective',    value: fmtDate(app.effective_date) },
                { label: 'Renewal Due',  value: fmtDate(app.renewal_date) },
                { label: 'Payer Ref #',  value: app.payer_reference ?? '—' },
                { label: 'Payer Prov. ID', value: app.payer_provider_id ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="detail-field" style={{ gap: 0 }}>
                  <dt>{label}</dt>
                  <dd style={{ color: value === '—' ? '#94a3b8' : '#0f172a' }}>{value}</dd>
                </div>
              ))}
            </dl>

            {app.denial_reason && (
              <div style={{ marginTop: '12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b91c1c', marginBottom: '4px' }}>
                  Denial Reason
                </div>
                <div style={{ fontSize: '12px', color: '#b91c1c' }}>{app.denial_reason}</div>
              </div>
            )}

            {app.notes && (
              <div style={{ marginTop: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8', marginBottom: '4px' }}>
                  Notes
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>{app.notes}</div>
              </div>
            )}
          </div>

          {/* Workflow fields */}
          <div className="card-lg">
            <p className="section-label">Workflow</p>
            <WorkflowFields
              applicationId={id}
              initialPriority={app.priority}
              initialNextAction={app.next_action}
              initialAssignedTo={app.assigned_to}
              initialFollowUpDate={app.follow_up_date}
            />
          </div>

          {/* Readiness check */}
          <div className="card-lg">
            <p className="section-label">Readiness Check</p>
            <ValidationPanel providerId={app.provider_id} groupId={app.group_id} />
          </div>

          {/* Payer forms available */}
          {payerForms.length > 0 && (
            <div className="card-lg">
              <p className="section-label">Available Forms</p>
              <div className="row-list">
                {payerForms.map((f) => (
                  <div key={f.id} className="row-list-item" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>{f.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {Object.keys(f.field_mappings ?? {}).length} fields mapped
                        {(f as unknown as { version?: string }).version ? ` · v${(f as unknown as { version: string }).version}` : ''}
                      </div>
                    </div>
                    <Link href={`/payer-forms/${f.id}`} style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none' }}>
                      Edit →
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
