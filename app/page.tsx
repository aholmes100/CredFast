import Link from 'next/link'
import { createClient } from './lib/supabase-server'
import type { ApplicationWithRelations } from './types'

const STATUS_CONFIG = {
  draft:     { label: 'Draft',     bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0',  dot: 'dot-draft' },
  ready:     { label: 'Ready',     bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe',  dot: 'dot-ready' },
  submitted: { label: 'Submitted', bg: '#fffbeb', color: '#b45309', border: '#fde68a',  dot: 'dot-submitted' },
  approved:  { label: 'Approved',  bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0',  dot: 'dot-approved' },
} as const

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function HomePage() {
  const supabase = await createClient()
  const [
    { count: providerCount },
    { count: groupCount },
    { count: locationCount },
    { count: appCount },
    { count: assignmentCount },
    { data: allApps },
    { data: recentApps },
  ] = await Promise.all([
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase.from('enrollment_applications').select('*', { count: 'exact', head: true }),
    supabase.from('provider_group_locations').select('*', { count: 'exact', head: true }),
    supabase.from('enrollment_applications').select('id, status'),
    supabase.from('enrollment_applications')
      .select(`id, status, created_at, submitted_at, providers(first_name, last_name), groups(name), payers(name)`)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const statusCounts = { draft: 0, ready: 0, submitted: 0, approved: 0 }
  for (const a of (allApps ?? [])) {
    const s = a.status as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  }

  const recent = (recentApps ?? []) as unknown as ApplicationWithRelations[]
  const submitted = recent.filter(a => a.status === 'submitted')
  const actionNeeded = recent.filter(a => a.status === 'ready')

  return (
    <main className="page-xl">
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Provider enrollment and credentialing — Pollux Medical Group</p>
      </div>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {[
          { label: 'Providers',    value: providerCount    ?? 0, href: '/providers',    sub: 'credentialed practitioners' },
          { label: 'Groups',       value: groupCount       ?? 0, href: '/groups',        sub: 'practice groups' },
          { label: 'Locations',    value: locationCount    ?? 0, href: '/locations',     sub: 'service sites' },
          { label: 'Assignments',  value: assignmentCount  ?? 0, href: '/assignments',   sub: 'provider placements' },
          { label: 'Applications', value: appCount         ?? 0, href: '/applications',  sub: 'total enrollment apps' },
        ].map(({ label, value, href, sub }) => (
          <Link key={href} href={href} className="metric-card">
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{sub}</div>
          </Link>
        ))}
      </div>

      {/* ── Application pipeline ──────────────────────────── */}
      <p className="section-label">Application Pipeline</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '28px' }}>
        {(Object.entries(statusCounts) as [keyof typeof STATUS_CONFIG, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <Link key={status} href={`/applications?status=${status}`} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: '10px', padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                transition: 'box-shadow 0.15s',
              }}>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 700, color: cfg.color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: '12px', color: cfg.color, marginTop: '4px', fontWeight: 500 }}>{cfg.label}</div>
                </div>
                <span className={`status-dot ${cfg.dot}`} style={{ width: '10px', height: '10px' }} />
              </div>
            </Link>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
        {/* ── Recent Applications ───────────────────────── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <p className="section-label" style={{ margin: 0 }}>Recent Applications</p>
            <Link href="/applications" style={{ fontSize: '11px', color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div className="card-list">
            {recent.length ? recent.map((app) => (
              <Link key={app.id} href={`/applications/${app.id}`} className="card-hover" style={{ padding: '12px 16px' }}>
                <div className="card-row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-dot ${STATUS_CONFIG[app.status as keyof typeof STATUS_CONFIG]?.dot}`} />
                      <span className="card-title" style={{ fontSize: '13px' }}>
                        {app.providers?.first_name} {app.providers?.last_name}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px', marginLeft: '15px' }}>
                      {app.payers?.name || '—'} · {app.groups?.name || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                    <span className={`badge badge-${app.status}`}>{app.status}</span>
                    <span style={{ fontSize: '10px', color: '#cbd5e1' }}>{fmt(app.created_at)}</span>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="empty-state" style={{ padding: '24px 16px' }}>No applications yet.</div>
            )}
          </div>
        </div>

        {/* ── Action items + Quick Actions ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Needs attention */}
          <div>
            <p className="section-label">Needs Attention</p>
            <div className="card-list">
              {actionNeeded.length === 0 && submitted.length === 0 ? (
                <div className="card-lg" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>✓ No pending actions</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>All applications are up to date.</div>
                </div>
              ) : (
                <>
                  {actionNeeded.slice(0, 2).map((app) => (
                    <Link key={app.id} href={`/applications/${app.id}`} className="card-hover" style={{ padding: '10px 14px', borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {app.providers?.first_name} {app.providers?.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '2px' }}>
                        Ready — pending submission to {app.payers?.name || 'payer'}
                      </div>
                    </Link>
                  ))}
                  {submitted.slice(0, 2).map((app) => (
                    <Link key={app.id} href={`/applications/${app.id}`} className="card-hover" style={{ padding: '10px 14px', borderLeft: '3px solid #f59e0b' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                        {app.providers?.first_name} {app.providers?.last_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                        Submitted — awaiting response from {app.payers?.name || 'payer'}
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <p className="section-label">Quick Actions</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { href: '/applications/new', label: 'New Application', icon: '📋' },
                { href: '/providers/new',    label: 'New Provider',    icon: '👤' },
                { href: '/payer-forms/new',  label: 'New Payer Form',  icon: '📄' },
                { href: '/assignments/new',  label: 'New Assignment',  icon: '🔗' },
              ].map(({ href, label, icon }) => (
                <Link key={href} href={href} className="section-card" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>{icon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>{label}</span>
                  </div>
                  <span className="section-card-arrow" style={{ fontSize: '14px' }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
