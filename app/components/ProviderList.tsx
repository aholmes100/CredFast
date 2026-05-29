'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Provider } from '../types'
import DeleteRowButton from './DeleteRowButton'

function expirationColor(d: string | null | undefined) {
  if (!d) return '#94a3b8'
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  if (days < 0)  return '#dc2626'
  if (days < 90) return '#d97706'
  return '#16a34a'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function credStatus(p: Provider): 'expired' | 'expiring' | 'ok' {
  const dates = [p.license_expiration, p.malpractice_expiration, p.board_expiration].filter(Boolean) as string[]
  for (const d of dates) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (days < 0)  return 'expired'
  }
  for (const d of dates) {
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
    if (days < 90) return 'expiring'
  }
  return 'ok'
}

interface Props { providers: Provider[] }

export default function ProviderList({ providers }: Props) {
  const [search,    setSearch]    = useState('')
  const [specialty, setSpecialty] = useState('')
  const [panel,     setPanel]     = useState('')   // '' | 'open' | 'closed'
  const [creds,     setCreds]     = useState('')   // '' | 'expiring' | 'expired'

  const specialties = useMemo(() =>
    Array.from(new Set(providers.map(p => p.specialty).filter(Boolean) as string[])).sort(),
    [providers]
  )

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
        const s = credStatus(p)
        if (creds !== s) return false
      }
      return true
    })
  }, [providers, search, specialty, panel, creds])

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
            display: 'grid', gridTemplateColumns: '1fr 140px 120px 140px 120px 32px',
            padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
          }}>
            {['Provider', 'NPI · Specialty', 'License', 'Malpractice', 'CAQH · DEA', ''].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{h}</span>
            ))}
          </div>

          {filtered.map((p, idx) => {
            const licColor = expirationColor(p.license_expiration)
            const malColor = expirationColor(p.malpractice_expiration)
            return (
              <div key={p.id} className="table-row-hover" style={{
                display: 'grid', gridTemplateColumns: '1fr 140px 120px 140px 120px 32px',
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

                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                    {p.license_number || '—'}
                    {p.license_state && <span style={{ color: '#94a3b8', fontWeight: 400 }}> {p.license_state}</span>}
                  </div>
                  {p.license_expiration && (
                    <div style={{ fontSize: '11px', color: licColor, marginTop: '1px', fontWeight: licColor !== '#16a34a' ? 600 : 400 }}>
                      exp {fmtDate(p.license_expiration)}
                    </div>
                  )}
                </Link>

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

                <Link href={`/providers/${p.id}`} style={{ textDecoration: 'none' }}>
                  {p.caqh_number && <div style={{ fontSize: '11px', color: '#475569' }}>CAQH {p.caqh_number}</div>}
                  {p.dea_number  && <div style={{ fontSize: '11px', color: '#475569', marginTop: '1px' }}>DEA {p.dea_number}</div>}
                  {!p.caqh_number && !p.dea_number && <span style={{ fontSize: '11px', color: '#cbd5e1' }}>—</span>}
                </Link>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DeleteRowButton table="providers" id={p.id} label="provider" />
                </div>
              </div>
            )
          })}
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
