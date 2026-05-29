'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Group } from '../types'

interface Props { groups: Group[] }

export default function GroupList({ groups }: Props) {
  const [search,       setSearch]       = useState('')
  const [practiceType, setPracticeType] = useState('')

  const practiceTypes = useMemo(() =>
    Array.from(new Set(groups.map(g => g.practice_type).filter(Boolean) as string[])).sort(),
    [groups]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter(g => {
      if (q) {
        const hay = [g.name, g.legal_name, g.tax_id, g.group_npi].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (practiceType && g.practice_type !== practiceType) return false
      return true
    })
  }, [groups, search, practiceType])

  const hasFilters = search || practiceType
  const clear = () => { setSearch(''); setPracticeType('') }

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
          placeholder="Search by name, legal name, tax ID, or NPI…"
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        {practiceTypes.length > 0 && (
          <select className={`filter-select${practiceType ? ' active' : ''}`}
            value={practiceType} onChange={e => setPracticeType(e.target.value)}>
            <option value="">All Practice Types</option>
            {practiceTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <span className="filter-count">{filtered.length} of {groups.length}</span>
        {hasFilters && <button className="filter-clear" onClick={clear}>Clear filters</button>}
      </div>

      {filtered.length > 0 ? (
        <div className="card-list">
          {filtered.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`} className="card-hover">
              <div className="card-row">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="card-title">{group.name}</div>
                  {group.legal_name && group.legal_name !== group.name && (
                    <div className="card-sub">{group.legal_name}</div>
                  )}
                  <div className="card-meta" style={{ marginTop: '6px' }}>
                    <span className="card-meta-item">Tax ID: <strong>{group.tax_id || '—'}</strong></span>
                    <span className="card-meta-item">Group NPI: <strong>{group.group_npi || '—'}</strong></span>
                    {group.practice_type && <span className="card-meta-item">{group.practice_type}</span>}
                  </div>
                </div>
                <span style={{ color: '#cbd5e1', fontSize: '18px', flexShrink: 0 }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {hasFilters
            ? <><span>No groups match your filters. </span><button className="filter-clear" style={{ fontSize: '13px' }} onClick={clear}>Clear filters</button></>
            : <><span>No groups yet. </span><Link href="/groups/new">Add the first one.</Link></>
          }
        </div>
      )}
    </div>
  )
}
