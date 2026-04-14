import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { Provider } from '../types'
import DeleteRowButton from '../components/DeleteRowButton'

function expirationColor(dateStr: string | null | undefined): string {
  if (!dateStr) return '#94a3b8'
  const d = new Date(dateStr)
  const now = new Date()
  const daysUntil = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (daysUntil < 0)   return '#dc2626'  // expired
  if (daysUntil < 90)  return '#d97706'  // expiring within 90 days
  return '#16a34a'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ProvidersPage() {
  const { data: providers, error } = await supabase
    .from('providers')
    .select('*')
    .order('last_name')

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading providers.</div>
      </main>
    )
  }

  const list = (providers ?? []) as Provider[]

  return (
    <main className="page-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Providers</h1>
          <p className="page-subtitle">{list.length} credentialed practitioner{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/providers/new" className="btn btn-primary">+ New Provider</Link>
      </div>

      {list.length ? (
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 120px 140px 120px 32px',
            padding: '10px 16px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
          }}>
            {['Provider', 'NPI · Specialty', 'License', 'Malpractice', 'CAQH · DEA', ''].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {list.map((p, idx) => {
            const licenseColor = expirationColor(p.license_expiration)
            const malColor = expirationColor(p.malpractice_expiration)
            return (
              <div
                key={p.id}
                className="table-row-hover"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px 120px 140px 120px 32px',
                  padding: '12px 16px',
                  borderBottom: idx < list.length - 1 ? '1px solid #f1f5f9' : 'none',
                  alignItems: 'center',
                }}
              >
                {/* Name + email */}
                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                    {p.last_name}, {p.first_name}
                  </div>
                  {p.email && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{p.email}</div>
                  )}
                  {p.accepting_new_patients === false && (
                    <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', marginTop: '2px', display: 'inline-block' }}>
                      Closed panel
                    </span>
                  )}
                </Link>

                {/* NPI + specialty */}
                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>{p.npi || '—'}</div>
                  {p.specialty && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{p.specialty}</div>}
                </Link>

                {/* License */}
                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                    {p.license_number || '—'}
                    {p.license_state && <span style={{ color: '#94a3b8', fontWeight: 400 }}> {p.license_state}</span>}
                  </div>
                  {p.license_expiration && (
                    <div style={{ fontSize: '11px', color: licenseColor, marginTop: '1px', fontWeight: licenseColor !== '#16a34a' ? 600 : 400 }}>
                      exp {fmtDate(p.license_expiration)}
                    </div>
                  )}
                </Link>

                {/* Malpractice */}
                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '11px', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.malpractice_carrier || '—'}
                  </div>
                  {p.malpractice_expiration && (
                    <div style={{ fontSize: '11px', color: malColor, marginTop: '1px', fontWeight: malColor !== '#16a34a' ? 600 : 400 }}>
                      exp {fmtDate(p.malpractice_expiration)}
                    </div>
                  )}
                </Link>

                {/* CAQH + DEA */}
                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  {p.caqh_number && <div style={{ fontSize: '11px', color: '#475569' }}>CAQH {p.caqh_number}</div>}
                  {p.dea_number && <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>DEA {p.dea_number}</div>}
                  {!p.caqh_number && !p.dea_number && <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>}
                </Link>

                {/* Delete */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DeleteRowButton table="providers" id={p.id} label="provider" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          No providers yet. <Link href="/providers/new">Add the first one.</Link>
        </div>
      )}
    </main>
  )
}
