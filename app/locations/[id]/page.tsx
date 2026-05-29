import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '../../lib/supabase-server'
import type { Location, Group } from '../../types'
import LocationDetailEditor from '../../components/LocationDetailEditor'
import DeleteButton from '../../components/DeleteButton'

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select('*, groups(name)')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const location = data as Location & { groups: Pick<Group, 'name'> | null }

  return (
    <main className="page-wide">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/locations" className="breadcrumb-link">Locations</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{location.name}</span>
      </div>

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{location.name}</h1>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {location.groups?.name && (
              <span className="pill">{location.groups.name}</span>
            )}
            {location.facility_type && (
              <span className="pill">{location.facility_type}</span>
            )}
            {location.city && location.state && (
              <span className="pill">{location.city}, {location.state}</span>
            )}
            {!location.is_active && (
              <span className="pill" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Inactive</span>
            )}
          </div>
        </div>
        <DeleteButton table="locations" id={location.id} label="Delete Location" redirectTo="/locations" />
      </div>

      {/* Editable location form */}
      <LocationDetailEditor location={location} />
    </main>
  )
}
