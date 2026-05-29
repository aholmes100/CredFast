import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { LocationWithGroup } from '../types'
import LocationList from '../components/LocationList'

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

      <LocationList locations={list} />
    </main>
  )
}
