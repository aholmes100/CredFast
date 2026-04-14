import Link from 'next/link'
import { supabase } from '../lib/supabase'
import type { LocationWithGroup } from '../types'
import DeleteRowButton from '../components/DeleteRowButton'

export default async function LocationsPage() {
  const { data: locations, error } = await supabase
    .from('locations')
    .select(`*, groups(name)`)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading locations.</div>
      </main>
    )
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Practice locations and service addresses</p>
        </div>
        <Link href="/locations/new" className="btn btn-primary">+ New Location</Link>
      </div>

      {locations?.length ? (
        <div className="card-list">
          {locations.map((location: LocationWithGroup) => (
            <div key={location.id} className="card">
              <div className="card-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="card-title">{location.name}</div>
                    {location.groups?.name && (
                      <span className="pill">{location.groups.name}</span>
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
                </div>
                <DeleteRowButton table="locations" id={location.id} label="location" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No locations yet. <Link href="/locations/new">Add the first one.</Link>
        </div>
      )}
    </main>
  )
}
