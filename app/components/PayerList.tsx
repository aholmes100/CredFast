'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Payer } from '../types'
import DeleteRowButton from './DeleteRowButton'

interface Props { payers: Payer[] }

export default function PayerList({ payers }: Props) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return payers
    return payers.filter(p => {
      const hay = [p.name, p.payer_id_code, p.enrollment_phone, p.enrollment_address]
        .filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [payers, search])

  const hasFilters = !!search
  const clear = () => setSearch('')

  return (
    <div>
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
          placeholder="Search by name or payer ID…"
        />
        {search && <button className="search-clear" onClick={clear}>×</button>}
      </div>

      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        <span className="filter-count">{filtered.length} of {payers.length}</span>
        {hasFilters && <button className="filter-clear" onClick={clear}>Clear filters</button>}
      </div>

      {filtered.length > 0 ? (
        <div className="card-list">
          {filtered.map((payer) => (
            <div key={payer.id} className="card">
              <div className="card-row">
                <Link href={`/payers/${payer.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                  <div className="card-title">{payer.name}</div>
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    {payer.payer_id_code && (
                      <span className="card-meta-item">ID: <strong>{payer.payer_id_code}</strong></span>
                    )}
                    {payer.processing_days && (
                      <span className="card-meta-item">~{payer.processing_days} day turnaround</span>
                    )}
                    {payer.enrollment_phone && (
                      <span className="card-meta-item">{payer.enrollment_phone}</span>
                    )}
                  </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <Link href={`/payer-forms?payer=${payer.id}`} className="btn btn-secondary btn-sm">
                    Forms
                  </Link>
                  <DeleteRowButton table="payers" id={payer.id} label="payer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {hasFilters
            ? <><span>No payers match your search. </span><button className="filter-clear" style={{ fontSize: '13px' }} onClick={clear}>Clear</button></>
            : <><span>No payers yet. </span><Link href="/payers/new">Add the first one.</Link></>
          }
        </div>
      )}
    </div>
  )
}
