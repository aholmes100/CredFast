import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { Provider } from '../types'
import ProviderList from '../components/ProviderList'
import EmptyState from '../components/EmptyState'

export default async function ProvidersPage() {
  const supabase = await createClient()
  const { data: providers, error } = await supabase
    .from('providers')
    .select('*')
    .order('last_name')

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading providers.</div>
      </main>
    )
  }

  const list = (providers ?? []) as Provider[]

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
        <ProviderList providers={list} />
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
