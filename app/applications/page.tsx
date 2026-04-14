import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { ApplicationWithRelations, ApplicationStatus } from '../types'
import DeleteRowButton from '../components/DeleteRowButton'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; bg: string; color: string; border: string }> = {
  draft:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
  ready:     { label: 'Ready',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  submitted: { label: 'Submitted', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  approved:  { label: 'Approved',  bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ApplicationsPage() {
  const { data: applications, error } = await supabase
    .from('enrollment_applications')
    .select(`*, providers(first_name, last_name), groups(name), payers(name)`)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading applications.</div>
      </main>
    )
  }

  const apps = (applications ?? []) as unknown as ApplicationWithRelations[]

  // Group by status for display counts
  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="page-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">
            {apps.length} total ·{' '}
            {['draft', 'ready', 'submitted', 'approved'].map((s, i) => (
              <span key={s} style={{ color: STATUS_CONFIG[s as ApplicationStatus].color, fontWeight: 500 }}>
                {i > 0 && ' · '}{counts[s] ?? 0} {s}
              </span>
            ))}
          </p>
        </div>
        <Link href="/applications/new" className="btn btn-primary">+ New Application</Link>
      </div>

      {apps.length ? (
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 200px 90px 110px 32px',
            gap: '0',
            padding: '10px 16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            {['Provider / Group', 'Payer', 'Type · Mode', 'Status', 'Date', ''].map((h) => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Table rows */}
          {apps.map((app, idx) => {
            const cfg = STATUS_CONFIG[app.status]
            const appType = (app as unknown as { application_type?: string }).application_type
            return (
              <div
                key={app.id}
                className="table-row-hover"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 200px 90px 110px 32px',
                  gap: '0',
                  padding: '12px 16px',
                  borderBottom: idx < apps.length - 1 ? '1px solid #f1f5f9' : 'none',
                  alignItems: 'center',
                }}
              >
                {/* Provider / Group */}
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.providers?.first_name} {app.providers?.last_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.groups?.name || '—'}
                  </div>
                </Link>

                {/* Payer */}
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.payers?.name || '—'}
                </Link>

                {/* Type + mode */}
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                    {appType ? appType.replace(/_/g, ' ') : 'initial'}
                  </span>
                  <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>
                    {app.location_mode === 'all' ? 'all locs' : 'sel. locs'}
                  </span>
                </Link>

                {/* Status */}
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '9999px',
                    fontSize: '11px', fontWeight: 600, backgroundColor: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.border}`, textTransform: 'capitalize',
                  }}>
                    {app.status}
                  </span>
                </Link>

                {/* Date */}
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', fontSize: '11px', color: '#94a3b8' }}>
                  {app.submitted_at ? (
                    <div>
                      <div style={{ color: '#64748b', fontWeight: 500 }}>{fmtDate(app.submitted_at)}</div>
                      <div>submitted</div>
                    </div>
                  ) : (
                    <div>
                      <div>{fmtDate(app.created_at)}</div>
                      <div>created</div>
                    </div>
                  )}
                </Link>

                {/* Delete */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DeleteRowButton table="enrollment_applications" id={app.id} label="application" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          No applications yet. <Link href="/applications/new">Create the first one.</Link>
        </div>
      )}
    </main>
  )
}
