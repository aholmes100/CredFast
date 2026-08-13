import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { Provider } from '../types'
import ProviderList, { type LicRow, type IdRow, type GroupLabel } from '../components/ProviderList'
import EmptyState from '../components/EmptyState'

type RawProvider = Provider & {
  provider_group_locations: Array<{
    is_primary: boolean
    is_active: boolean
    groups: { name: string; division_code: string | null } | null
  }> | null
}

export default async function ProvidersPage() {
  const supabase = await createClient()

  const { data: profileData } = await supabase.from('profiles').select('organization_id').single()
  const orgId = (profileData as { organization_id: string } | null)?.organization_id ?? ''

  const [
    { data: providers, error },
    { data: licenseRows },
    { data: identifierRows },
  ] = await Promise.all([
    supabase
      .from('providers')
      .select('*, provider_group_locations!left(is_primary, is_active, groups!left(name, division_code))')
      .order('last_name'),
    supabase
      .from('provider_licenses')
      .select('provider_id, expiration_date, is_primary')
      .eq('organization_id', orgId),
    supabase
      .from('provider_identifiers')
      .select('provider_id, identifier_type, effective_date')
      .eq('organization_id', orgId),
  ])

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading providers.</div>
      </main>
    )
  }

  const raw = (providers ?? []) as RawProvider[]

  const groupLabels: Record<string, GroupLabel> = {}
  for (const p of raw) {
    const assignments = p.provider_group_locations ?? []
    const match =
      assignments.find(a => a.is_primary && a.is_active && a.groups) ??
      assignments.find(a => a.is_active && a.groups) ??
      assignments.find(a => a.groups)
    if (match?.groups) groupLabels[p.id] = match.groups
  }

  const list = raw as unknown as Provider[]

  return (
    <main className="page-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Providers</h1>
          <p className="page-subtitle">{list.length} credentialed practitioner{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/providers/new" className="btn btn-primary">+ New Provider</Link>
      </div>

      {list.length > 0 ? (
        <ProviderList
          providers={list}
          groupLabels={groupLabels}
          initialLicenses={(licenseRows ?? []) as LicRow[]}
          initialIdentifiers={(identifierRows ?? []) as IdRow[]}
        />
      ) : (
        <EmptyState
          icon="👤"
          headline="No providers yet"
          context="Add your first provider to start managing their credentialing and enrollment applications."
          action={{ label: 'Add Provider', href: '/providers/new' }}
        />
      )}
    </main>
  )
}
