import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import ExportButton from '../components/ExportButton'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysStyle(days: number): { color: string; bg: string; border: string } {
  if (days < 30)  return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
  if (days <= 60) return { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' }
  return             { color: '#a16207',  bg: '#fefce8', border: '#fef08a' }
}

const STATUS_COLORS: Record<string, { color: string; bg: string; bar: string }> = {
  draft:     { color: '#64748b', bg: '#f1f5f9', bar: '#94a3b8' },
  ready:     { color: '#1d4ed8', bg: '#eff6ff', bar: '#60a5fa' },
  submitted: { color: '#b45309', bg: '#fffbeb', bar: '#fbbf24' },
  approved:  { color: '#15803d', bg: '#f0fdf4', bar: '#4ade80' },
}

const REQUIRED_FIELDS = [
  { key: 'npi',                   label: 'NPI' },
  { key: 'caqh_number',           label: 'CAQH' },
  { key: 'dea_number',            label: 'DEA' },
  { key: 'license_number',        label: 'License #' },
  { key: 'license_state',         label: 'License State' },
  { key: 'license_expiration',    label: 'License Exp.' },
  { key: 'malpractice_carrier',   label: 'Malpractice Carrier' },
  { key: 'malpractice_expiration',label: 'Malpractice Exp.' },
  { key: 'specialty',             label: 'Specialty' },
  { key: 'taxonomy_code',         label: 'Taxonomy' },
]

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExpirationRow {
  providerId: string
  name: string
  credential: string
  date: string
  daysUntil: number
}

interface IncompleteProvider {
  id: string
  name: string
  missingCount: number
  missingFields: string[]
}

interface PayerSummary {
  payerName: string
  total: number
  draft: number
  ready: number
  submitted: number
  approved: number
}

interface RecentApp {
  id: string
  status: string
  updated_at: string | null
  providers: { first_name: string; last_name: string } | null
  groups: { name: string } | null
  payers: { name: string } | null
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function ReportsPage() {
  const supabase = await createClient()

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const cutoff180 = new Date(now)
  cutoff180.setDate(cutoff180.getDate() + 180)
  const cutoff180Str = cutoff180.toISOString().slice(0, 10)

  const [
    { data: expiringProviders },
    { data: allApplications },
    { data: recentApps },
    { data: allProviders },
  ] = await Promise.all([
    supabase
      .from('providers')
      .select('id, first_name, last_name, license_expiration, malpractice_expiration, board_expiration')
      .or(`license_expiration.lte.${cutoff180Str},malpractice_expiration.lte.${cutoff180Str},board_expiration.lte.${cutoff180Str}`),
    supabase
      .from('enrollment_applications')
      .select('id, status, updated_at, payers(id, name)'),
    supabase
      .from('enrollment_applications')
      .select('id, status, updated_at, providers(first_name, last_name), groups(name), payers(name)')
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('providers')
      .select('id, first_name, last_name, npi, caqh_number, dea_number, license_number, license_state, license_expiration, malpractice_carrier, malpractice_expiration, specialty, taxonomy_code'),
  ])

  // ── Section 1: Expiration rows ─────────────────────────────────────────────
  const expirationRows: ExpirationRow[] = []
  for (const p of (expiringProviders ?? []) as { id: string; first_name: string; last_name: string; license_expiration: string | null; malpractice_expiration: string | null; board_expiration: string | null }[]) {
    const name = `${p.first_name} ${p.last_name}`
    for (const [date, credential] of [
      [p.license_expiration,    'Medical License'],
      [p.malpractice_expiration,'Malpractice Insurance'],
      [p.board_expiration,      'Board Certification'],
    ] as [string | null, string][]) {
      if (!date) continue
      const days = Math.ceil((new Date(date).getTime() - now) / 86400000)
      if (days <= 180) expirationRows.push({ providerId: p.id, name, credential, date, daysUntil: days })
    }
  }
  expirationRows.sort((a, b) => a.daysUntil - b.daysUntil)

  const expExpired = expirationRows.filter(r => r.daysUntil <  0).length
  const exp30      = expirationRows.filter(r => r.daysUntil >= 0  && r.daysUntil <  30).length
  const exp90      = expirationRows.filter(r => r.daysUntil >= 30 && r.daysUntil <  90).length
  const exp180     = expirationRows.filter(r => r.daysUntil >= 90 && r.daysUntil <= 180).length

  // ── Section 2: Pipeline ────────────────────────────────────────────────────
  const statusCounts = { draft: 0, ready: 0, submitted: 0, approved: 0 }
  for (const a of (allApplications ?? [])) {
    const s = a.status as keyof typeof statusCounts
    if (s in statusCounts) statusCounts[s]++
  }
  const appTotal = Object.values(statusCounts).reduce((sum, n) => sum + n, 0)
  const recent = (recentApps ?? []) as unknown as RecentApp[]

  // ── Section 3: Provider completeness ──────────────────────────────────────
  const incompleteProviders: IncompleteProvider[] = []
  for (const p of (allProviders ?? []) as Record<string, unknown>[]) {
    const missing = REQUIRED_FIELDS.filter(f => !p[f.key]).map(f => f.label)
    if (missing.length > 0) {
      incompleteProviders.push({
        id:            p.id as string,
        name:          `${p.first_name} ${p.last_name}`,
        missingCount:  missing.length,
        missingFields: missing,
      })
    }
  }
  incompleteProviders.sort((a, b) => b.missingCount - a.missingCount)

  // ── Section 4: Payer summary ───────────────────────────────────────────────
  const payerMap = new Map<string, PayerSummary>()
  for (const a of (allApplications ?? []) as unknown as { id: string; status: string; payers: { name: string } | null }[]) {
    const payerName = a.payers?.name ?? 'Unknown Payer'
    if (!payerMap.has(payerName)) {
      payerMap.set(payerName, { payerName, total: 0, draft: 0, ready: 0, submitted: 0, approved: 0 })
    }
    const entry = payerMap.get(payerName)!
    entry.total++
    const s = a.status as keyof Omit<PayerSummary, 'payerName' | 'total'>
    if (s === 'draft' || s === 'ready' || s === 'submitted' || s === 'approved') entry[s]++
  }
  const payerSummary = Array.from(payerMap.values()).sort((a, b) => b.total - a.total)

  // ── Shared styles ──────────────────────────────────────────────────────────
  const sectionHeader = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  } as const

  const thStyle = {
    padding: '9px 14px',
    textAlign: 'left' as const,
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: '#94a3b8',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
  }

  const tdStyle = {
    padding: '10px 14px',
    fontSize: '13px',
    color: '#475569',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle' as const,
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="page-xl">
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Credentialing operations overview</p>
      </div>

      {/* ── Section 1: Credential Expiration ─────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <div style={sectionHeader}>
          <p className="section-label" style={{ margin: 0 }}>Credential Expiration Report</p>
          <ExportButton label="Export CSV" />
        </div>

        {expirationRows.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
              No credentials expiring in the next 180 days
            </div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Provider', 'Credential', 'Expiration Date', 'Days Remaining', ''].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expirationRows.map((row, i) => {
                    const s = daysStyle(row.daysUntil)
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 500, color: '#0f172a' }}>{row.name}</td>
                        <td style={tdStyle}>{row.credential}</td>
                        <td style={tdStyle}>{fmtDate(row.date)}</td>
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 700,
                            color: s.color, backgroundColor: s.bg, border: `1px solid ${s.border}`,
                          }}>
                            {row.daysUntil < 0
                              ? `Expired ${Math.abs(row.daysUntil)}d ago`
                              : row.daysUntil === 0
                                ? 'Expires today'
                                : `${row.daysUntil}d`}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <Link href={`/providers/${row.providerId}`} style={{ fontSize: '12px', color: '#4f46e5', textDecoration: 'none' }}>
                            View →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '16px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              {expExpired > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠ {expExpired} expired</span>}
              {exp30   > 0 && <span style={{ color: '#dc2626' }}><strong>{exp30}</strong> expiring within 30 days</span>}
              {exp90   > 0 && <span style={{ color: '#c2410c' }}><strong>{exp90}</strong> expiring in 31–90 days</span>}
              {exp180  > 0 && <span style={{ color: '#a16207' }}><strong>{exp180}</strong> expiring in 91–180 days</span>}
            </div>
          </>
        )}
      </div>

      {/* ── Section 2: Enrollment Pipeline ───────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <div style={sectionHeader}>
          <p className="section-label" style={{ margin: 0 }}>Enrollment Pipeline</p>
          <ExportButton label="Export CSV" />
        </div>

        {appTotal === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
            No applications yet.
          </div>
        ) : (
          <>
            {/* Bar chart */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ height: '36px', borderRadius: '8px', overflow: 'hidden', display: 'flex', marginBottom: '12px', backgroundColor: '#f1f5f9' }}>
                {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
                  if (count === 0) return null
                  const pct = (count / appTotal) * 100
                  return (
                    <div
                      key={status}
                      title={`${status}: ${count} (${pct.toFixed(1)}%)`}
                      style={{
                        width: `${pct}%`, backgroundColor: STATUS_COLORS[status]?.bar ?? '#94a3b8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'width 0.3s',
                      }}
                    >
                      {pct > 8 && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                          {count}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {(Object.entries(statusCounts) as [string, number][]).map(([status, count]) => {
                  const pct = appTotal > 0 ? (count / appTotal * 100).toFixed(1) : '0'
                  const sc  = STATUS_COLORS[status] ?? STATUS_COLORS.draft
                  return (
                    <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: sc.bar, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#475569', textTransform: 'capitalize' }}>
                        {status}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: sc.color }}>
                        {count}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent applications table */}
            {recent.length > 0 && (
              <>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', marginBottom: '10px' }}>
                  Recently Updated
                </p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {['Provider', 'Payer', 'Group', 'Status', 'Last Updated'].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map(app => {
                        const sc = STATUS_COLORS[app.status] ?? STATUS_COLORS.draft
                        return (
                          <tr key={app.id} style={{ cursor: 'pointer' }}>
                            <td style={{ ...tdStyle, fontWeight: 500, color: '#0f172a' }}>
                              <Link href={`/applications/${app.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                                {app.providers ? `${app.providers.first_name} ${app.providers.last_name}` : '—'}
                              </Link>
                            </td>
                            <td style={tdStyle}>{app.payers?.name ?? '—'}</td>
                            <td style={tdStyle}>{app.groups?.name ?? '—'}</td>
                            <td style={tdStyle}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                color: sc.color, backgroundColor: sc.bg, textTransform: 'capitalize',
                              }}>
                                {app.status}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: '#94a3b8', fontSize: '12px' }}>
                              {app.updated_at ? fmtDate(app.updated_at) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Section 3: Provider Completeness ─────────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <div style={sectionHeader}>
          <p className="section-label" style={{ margin: 0 }}>Provider Completeness Report</p>
          <ExportButton label="Export CSV" />
        </div>

        {incompleteProviders.length === 0 ? (
          <div style={{ padding: '20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>✅</span>
            <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
              All providers have complete credentialing data.
            </span>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '14px' }}>
              <strong style={{ color: '#b91c1c' }}>{incompleteProviders.length}</strong> provider{incompleteProviders.length !== 1 ? 's' : ''} with incomplete data — sorted by most missing fields
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Provider', 'Missing Fields', 'Details'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incompleteProviders.map(p => (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        <Link href={`/providers/${p.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px', borderRadius: '9999px', fontSize: '12px', fontWeight: 700,
                          color: p.missingCount >= 5 ? '#dc2626' : p.missingCount >= 3 ? '#c2410c' : '#b45309',
                          backgroundColor: p.missingCount >= 5 ? '#fef2f2' : p.missingCount >= 3 ? '#fff7ed' : '#fffbeb',
                        }}>
                          {p.missingCount} missing
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {p.missingFields.map(f => (
                            <span key={f} style={{
                              display: 'inline-block',
                              padding: '1px 7px', borderRadius: '4px', fontSize: '11px',
                              backgroundColor: '#f1f5f9', color: '#475569',
                              border: '1px solid #e2e8f0',
                            }}>
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Section 4: Payer Enrollment Summary ──────────────────────────── */}
      <div className="card-lg" style={{ marginBottom: '20px' }}>
        <div style={sectionHeader}>
          <p className="section-label" style={{ margin: 0 }}>Payer Enrollment Summary</p>
          <ExportButton label="Export CSV" />
        </div>

        {payerSummary.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
            No applications yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Payer', 'Total', 'Draft', 'Ready', 'Submitted', 'Approved', 'Approval Rate'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payerSummary.map(ps => {
                  const approvalRate = ps.total > 0 ? Math.round((ps.approved / ps.total) * 100) : 0
                  return (
                    <tr key={ps.payerName}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: '#0f172a' }}>{ps.payerName}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{ps.total}</td>
                      {(['draft', 'ready', 'submitted', 'approved'] as const).map(s => {
                        const count = ps[s]
                        const sc = STATUS_COLORS[s]
                        return (
                          <td key={s} style={tdStyle}>
                            {count > 0 ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                                color: sc.color, backgroundColor: sc.bg,
                              }}>
                                {count}
                              </span>
                            ) : (
                              <span style={{ color: '#e2e8f0' }}>—</span>
                            )}
                          </td>
                        )
                      })}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', minWidth: '60px' }}>
                            <div style={{ width: `${approvalRate}%`, height: '100%', backgroundColor: '#4ade80', borderRadius: '9999px' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: approvalRate > 0 ? '#15803d' : '#94a3b8', whiteSpace: 'nowrap' }}>
                            {approvalRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
