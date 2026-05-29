import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { LocationWithGroup } from '../types'
import LocationList from '../components/LocationList'
import EmptyState from '../components/EmptyState'

export default async function LocationsPage() {
  const supabase = await createClient()
  const { data: locations, error } = await supabase
    .from('locations')
    .select(`*, groups(name)`)
    .order('name')

  if (error) {
    return (
      <main className="page">
        <div className="alert-error">Error loading locations.</div>
      </main>
    )
  }

  const list = (locations ?? []) as LocationWithGroup[]

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Locations</h1>
          <p className="page-subtitle">Practice locations and service addresses</p>
        </div>
        <Link href="/locations/new" className="btn btn-primary">+ New Location</Link>
      </div>

      {list.length > 0 ? (
        <LocationList locations={list} />
      ) : (
        <EmptyState
          icon="📍"
          headline="No locations yet"
          context="Locations are the physical practice sites where providers see patients and bill insurance."
          action={{ label: 'Add Location', href: '/locations/new' }}
        />
      )}
    </main>
  )
}
