import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import type { ApplicationWithRelations, ApplicationStatus } from '../types'
import ApplicationList from '../components/ApplicationList'
import EmptyState from '../components/EmptyState'

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: '#64748b' },
  ready:     { label: 'Ready',     color: '#1d4ed8' },
  submitted: { label: 'Submitted', color: '#b45309' },
  approved:  { label: 'Approved',  color: '#15803d' },
}

export default async function ApplicationsPage() {
  const supabase = await createClient()
  const { data: applications, error } = await supabase
    .from('enrollment_applications')
    .select(`*, providers(first_name, last_name), groups(name), payers(name)`)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="page-xl">
        <div className="alert-error">Error loading applications.</div>
      </main>
    )
  }

  const apps = (applications ?? []) as unknown as ApplicationWithRelations[]

  const counts = apps.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="page-xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Applications</h1>
          <p className="page-subtitle">
            {apps.length} total ·{' '}
            {(['draft', 'ready', 'submitted', 'approved'] as ApplicationStatus[]).map((s, i) => (
              <span key={s} style={{ color: STATUS_CONFIG[s].color, fontWeight: 500 }}>
                {i > 0 && ' · '}{counts[s] ?? 0} {s}
              </span>
            ))}
          </p>
        </div>
        <Link href="/applications/new" className="btn btn-primary">+ New Application</Link>
      </div>

      {apps.length > 0 ? (
        <ApplicationList apps={apps} />
      ) : (
        <EmptyState
          icon="📋"
          headline="No enrollment applications yet"
          context="Applications track the status of each provider's enrollment with a specific payer and location."
          action={{ label: 'New Application', href: '/applications/new' }}
        />
      )}
    </main>
  )
}
