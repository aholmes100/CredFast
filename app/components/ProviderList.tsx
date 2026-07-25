'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Provider } from '../types'
import DeleteRowButton from './DeleteRowButton'

export type LicRow = { provider_id: string; expiration_date: string | null; is_primary: boolean }
export type IdRow  = { provider_id: string; identifier_type: string; effective_date: string | null }

function credStatus(
  licRows: LicRow[],
  idRows: IdRow[]
): 'expired' | 'expiring' | 'active' | 'none' {
  if (licRows.length === 0 && idRows.length === 0) return 'none'

  const dates = [
    ...licRows.map(l => l.expiration_date),
    ...idRows.filter(i => i.identifier_type === 'dea').map(i => i.effective_date),
  ].filter(Boolean) as string[]

  let worst: 'active' | 'expiring' = 'active'
  for (const d of dates) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (days < 0)  return 'expired'
    if (days < 90) worst = 'expiring'
  }
  return worst
}

function CredBadge({ status }: { status: 'expired' | 'expiring' | 'active' | 'none' }) {
  const config = {
    expired:  { label: 'Expired',         color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    expiring: { label: 'Expiring Soon',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
    active:   { label: 'Active',          color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
    none:     { label: 'No credentials',  color: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  }[status]
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, color: config.color,
      backgroundColor: config.bg, border: `1px solid ${config.border}`,
      borderRadius: '5px', padding: '2px 8px', whiteSpace: 'nowrap',
    }}>
      {config.label}
    </span>
  )
}

interface Props {
  providers: Provider[]
  initialLicenses: LicRow[]
  initialIdentifiers: IdRow[]
}

export default function ProviderList({ providers, initialLicenses, initialIdentifiers }: Props) {
  const searchParams = useSearchParams()
  const [search,    setSearch]    = useState('')
  const [specialty, setSpecialty] = useState('')
  const [panel,     setPanel]     = useState('')
  const [creds,     setCreds]     = useState(searchParams.get('creds') ?? '')

  const specialties = useMemo(() =>
    Array.from(new Set(providers.map(p => p.specialty).filter(Boolean) as string[])).sort(),
    [providers]
  )

  const licensesByProv = useMemo(() => {
    const m = new Map<string, LicRow[]>()
    for (const l of initialLicenses) {
      if (!m.has(l.provider_id)) m.set(l.provider_id, [])
      m.get(l.provider_id)!.push(l)
    }
    return m
  }, [initialLicenses])

  const identsByProv = useMemo(() => {
    const m = new Map<string, IdRow[]>()
    for (const i of initialIdentifiers) {
      if (!m.has(i.provider_id)) m.set(i.provider_id, [])
      m.get(i.provider_id)!.push(i)
    }
    return m
  }, [initialIdentifiers])

  const statusMap = useMemo(() => {
    const m = new Map<string, ReturnType<typeof credStatus>>()
    for (const p of providers) {
      m.set(p.id, credStatus(licensesByProv.get(p.id) ?? [], identsByProv.get(p.id) ?? []))
    }
    return m
  }, [providers, licensesByProv, identsByProv])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return providers.filter(p => {
      if (q) {
        const hay = [p.first_name, p.last_name, p.npi, p.email, p.specialty, p.credential_suffix]
          .filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (specialty && p.specialty !== specialty) return false
      if (panel === 'open'   && p.accepting_new_patients !== true)  return false
      if (panel === 'closed' && p.accepting_new_patients !== false) return false
      if (creds) {
        const s = statusMap.get(p.id) ?? 'none'
        if (creds !== s) return false
      }
      return true
    })
  }, [providers, search, specialty, panel, creds, statusMap])

  const hasFilters = search || specialty || panel || creds
  const clear = () => { setSearch(''); setSpecialty(''); setPanel(''); setCreds('') }

  return (
    <div>
      {/* ── Search bar ─────────────────────────────────── */}
      <div className="search-wrap">
        <span className="search-wrap-icon">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.75"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          className="search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, NPI, specialty, email…"
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      {/* ── Filter row ─────────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <select className={`filter-select${specialty ? ' active' : ''}`}
          value={specialty} onChange={e => setSpecialty(e.target.value)}>
          <option value="">All Specialties</option>
          {specialties.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select className={`filter-select${panel ? ' active' : ''}`}
          value={panel} onChange={e => setPanel(e.target.value)}>
          <option value="">Panel Status</option>
          <option value="open">Accepting patients</option>
          <option value="closed">Closed panel</option>
        </select>

        <select className={`filter-select${creds ? ' active' : ''}`}
          value={creds} onChange={e => setCreds(e.target.value)}>
          <option value="">All Credentials</option>
          <option value="expiring">Expiring soon (&lt;90 days)</option>
          <option value="expired">Expired</option>
        </select>

        <span className="filter-count">{filtered.length} of {providers.length}</span>
        {hasFilters && <button className="filter-clear" onClick={clear}>Clear filters</button>}
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 140px 32px',
            padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
          }}>
            {['Provider', 'NPI · Specialty', 'Credential Status', ''].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{h}</span>
            ))}
          </div>

          {filtered.map((p, idx) => (
            <div key={p.id} className="table-row-hover" style={{
              display: 'grid', gridTemplateColumns: '1fr 180px 140px 32px',
              padding: '12px 16px',
              borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
              alignItems: 'center',
            }}>
              <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  {p.last_name}, {p.first_name}
                  {p.credential_suffix && <span style={{ fontWeight: 400, color: '#64748b' }}> {p.credential_suffix}</span>}
                </div>
                {p.email && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{p.email}</div>}
                {p.accepting_new_patients === false && (
                  <span style={{ fontSize: '10px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', marginTop: '2px', display: 'inline-block' }}>
                    Closed panel
                  </span>
                )}
              </Link>

              <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>{p.npi || '—'}</div>
                {p.specialty && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{p.specialty}</div>}
              </Link>

              <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                <CredBadge status={statusMap.get(p.id) ?? 'none'} />
              </Link>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <DeleteRowButton table="providers" id={p.id} label="provider" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {hasFilters
            ? <><span>No providers match your filters. </span><button className="filter-clear" style={{ fontSize: '13px' }} onClick={clear}>Clear filters</button></>
            : <><span>No providers yet. </span><Link href="/providers/new">Add the first one.</Link></>
          }
        </div>
      )}
    </div>
  )
}
