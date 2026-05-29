'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ApplicationWithRelations, ApplicationStatus } from '../types'
import DeleteRowButton from './DeleteRowButton'

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

interface Props { apps: ApplicationWithRelations[] }

export default function ApplicationList({ apps }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')  // '' | 'draft' | 'ready' | 'submitted' | 'approved'

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return apps.filter(a => {
      if (q) {
        const hay = [
          a.providers?.first_name, a.providers?.last_name,
          a.payers?.name, a.groups?.name, a.payer_reference,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (status && a.status !== status) return false
      return true
    })
  }, [apps, search, status])

  // Status counts for the filter bar
  const counts = useMemo(() =>
    apps.reduce((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc }, {} as Record<string, number>),
    [apps]
  )

  const hasFilters = search || status
  const clear = () => { setSearch(''); setStatus('') }

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
          placeholder="Search by provider, payer, or group name…"
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      {/* ── Filter row ─────────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            onClick={() => setStatus('')}
            style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
              cursor: 'pointer', border: '1px solid',
              borderColor: !status ? '#6366f1' : '#e2e8f0',
              backgroundColor: !status ? '#eef2ff' : '#fff',
              color: !status ? '#4f46e5' : '#64748b',
            }}
          >
            All ({apps.length})
          </button>
          {(['draft', 'ready', 'submitted', 'approved'] as ApplicationStatus[]).map(s => {
            const cfg = STATUS_CONFIG[s]
            const active = status === s
            return (
              <button key={s} onClick={() => setStatus(active ? '' : s)} style={{
                padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', border: '1px solid',
                borderColor: active ? cfg.border : '#e2e8f0',
                backgroundColor: active ? cfg.bg : '#fff',
                color: active ? cfg.color : '#64748b',
              }}>
                {cfg.label} {counts[s] ? `(${counts[s]})` : '(0)'}
              </button>
            )
          })}
        </div>

        <span className="filter-count">{filtered.length} of {apps.length}</span>
        {hasFilters && <button className="filter-clear" onClick={clear}>Clear filters</button>}
      </div>

      {/* ── Table ──────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="card-lg" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 160px 200px 90px 110px 32px',
            padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
          }}>
            {['Provider / Group', 'Payer', 'Type · Mode', 'Status', 'Date', ''].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>{h}</span>
            ))}
          </div>

          {filtered.map((app, idx) => {
            const cfg     = STATUS_CONFIG[app.status]
            const appType = (app as unknown as { application_type?: string }).application_type
            return (
              <div key={app.id} className="table-row-hover" style={{
                display: 'grid', gridTemplateColumns: '1fr 160px 200px 90px 110px 32px',
                padding: '12px 16px',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                alignItems: 'center',
              }}>
                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', color: 'inherit', minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.providers?.first_name} {app.providers?.last_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.groups?.name || '—'}
                  </div>
                </Link>

                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {app.payers?.name || '—'}
                </Link>

                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                    {appType ? appType.replace(/_/g, ' ') : 'initial'}
                  </span>
                  <span style={{ fontSize: '11px', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>
                    {app.location_mode === 'all' ? 'all locs' : 'sel. locs'}
                  </span>
                </Link>

                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '3px 9px',
                    borderRadius: '9999px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    textTransform: 'capitalize',
                  }}>{app.status}</span>
                </Link>

                <Link href={`/applications/${app.id}`} style={{ textDecoration: 'none', fontSize: '11px', color: '#94a3b8' }}>
                  {app.submitted_at ? (
                    <div><div style={{ color: '#64748b', fontWeight: 500 }}>{fmtDate(app.submitted_at)}</div><div>submitted</div></div>
                  ) : (
                    <div><div>{fmtDate(app.created_at)}</div><div>created</div></div>
                  )}
                </Link>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <DeleteRowButton table="enrollment_applications" id={app.id} label="application" />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          {hasFilters
            ? <><span>No applications match your filters. </span><button className="filter-clear" style={{ fontSize: '13px' }} onClick={clear}>Clear filters</button></>
            : <><span>No applications yet. </span><Link href="/applications/new">Create the first one.</Link></>
          }
        </div>
      )}
    </div>
  )
}
