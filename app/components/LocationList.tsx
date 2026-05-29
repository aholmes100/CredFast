'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { LocationWithGroup } from '../types'
import DeleteRowButton from './DeleteRowButton'

interface Props {
  locations: LocationWithGroup[]
}

export default function LocationList({ locations }: Props) {
  const [search,       setSearch]       = useState('')
  const [groupFilter,  setGroupFilter]  = useState('')
  const [activeFilter, setActiveFilter] = useState('')   // '' | 'active' | 'inactive'
  const [typeFilter,   setTypeFilter]   = useState('')

  const groups = useMemo(() =>
    Array.from(
      new Map(
        locations
          .filter(l => l.groups?.name)
          .map(l => [l.group_id!, l.groups!.name])
      ).entries()
    ).sort((a, b) => a[1].localeCompare(b[1])),
    [locations]
  )

  const facilityTypes = useMemo(() =>
    Array.from(new Set(locations.map(l => l.facility_type).filter(Boolean) as string[])).sort(),
    [locations]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return locations.filter(l => {
      if (q) {
        const hay = [l.name, l.address_1, l.city, l.state, l.zip].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (groupFilter  && l.group_id !== groupFilter) return false
      if (activeFilter === 'active'   && !l.is_active)  return false
      if (activeFilter === 'inactive' && l.is_active)   return false
      if (typeFilter   && l.facility_type !== typeFilter) return false
      return true
    })
  }, [locations, search, groupFilter, activeFilter, typeFilter])

  const hasFilters = search || groupFilter || activeFilter || typeFilter
  const clear = () => { setSearch(''); setGroupFilter(''); setActiveFilter(''); setTypeFilter('') }

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
          placeholder="Search by name, address, or city…"
        />
        {search && <button className="search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      <div className="filter-bar" style={{ marginBottom: '16px' }}>
        {groups.length > 0 && (
          <select className={`filter-select${groupFilter ? ' active' : ''}`}
            value={groupFilter} onChange={e => setGroupFilter(e.target.value)}>
            <option value="">All Groups</option>
            {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        {facilityTypes.length > 0 && (
          <select className={`filter-select${typeFilter ? ' active' : ''}`}
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {facilityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <select className={`filter-select${activeFilter ? ' active' : ''}`}
          value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <span className="filter-count">{filtered.length} of {locations.length}</span>
        {hasFilters && <button className="filter-clear" onClick={clear}>Clear filters</button>}
      </div>

      {filtered.length > 0 ? (
        <div className="card-list">
          {filtered.map(location => (
            <div key={location.id} className="card">
              <div className="card-row">
                <Link href={`/locations/${location.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="card-title">{location.name}</div>
                    {location.groups?.name && <span className="pill">{location.groups.name}</span>}
                    {location.facility_type && <span className="pill">{location.facility_type}</span>}
                    {!location.is_active && (
                      <span className="pill" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Inactive</span>
                    )}
                  </div>
                  {location.address_1 && (
                    <div className="card-sub" style={{ marginTop: '4px' }}>
                      {location.address_1}
                      {location.city  ? `, ${location.city}`  : ''}
                      {location.state ? `, ${location.state}` : ''}
                      {location.zip   ? ` ${location.zip}`    : ''}
                    </div>
                  )}
                  {(location.phone || location.fax) && (
                    <div className="card-meta" style={{ marginTop: '4px' }}>
                      {location.phone && <span className="card-meta-item">Ph: {location.phone}</span>}
                      {location.fax   && <span className="card-meta-item">Fax: {location.fax}</span>}
                    </div>
                  )}
                </Link>
                <DeleteRowButton table="locations" id={location.id} label="location" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          {hasFilters
            ? <><span>No locations match your filters. </span><button className="filter-clear" style={{ fontSize: '13px' }} onClick={clear}>Clear filters</button></>
            : <><span>No locations yet. </span><Link href="/locations/new">Add the first one.</Link></>
          }
        </div>
      )}
    </div>
  )
}
