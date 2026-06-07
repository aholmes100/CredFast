import { notFound } from 'next/navigation'
import { createClient } from '../../../../lib/supabase-server'
import type { EnrollmentActivityLog, TeamMember } from '../../../../types'
import EnrollmentDetailView from '../../../../components/EnrollmentDetailView'

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; enrollment_id: string }>
}) {
  const { id: providerId, enrollment_id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase
    .from('profiles')
    .select('organization_id')
    .single()

  const orgId  = (profileData as { organization_id: string } | null)?.organization_id ?? ''
  const userId = user?.id ?? ''

  // Load enrollment + provider name in parallel (sequential because apps need payer_id)
  const [
    { data: enrollmentData, error: enrollmentError },
    { data: providerData },
  ] = await Promise.all([
    supabase
      .from('provider_payer_enrollments')
      .select('*, payers(id, name, enrollment_phone, enrollment_url, enrollment_fax)')
      .eq('id', enrollment_id)
      .single(),
    supabase
      .from('providers')
      .select('first_name, last_name')
      .eq('id', providerId)
      .single(),
  ])

  if (enrollmentError || !enrollmentData) notFound()

  const payerId = enrollmentData.payer_id as string

  // Now load apps + activity log + team members in parallel
  const [
    { data: appRows },
    { data: activityRows },
    { data: teamRows },
  ] = await Promise.all([
    supabase
      .from('enrollment_applications')
      .select('id, status, created_at, submitted_at, groups(name)')
      .eq('provider_id', providerId)
      .eq('payer_id', payerId)
      .order('created_at', { ascending: false }),
    supabase
      .from('enrollment_activity_log')
      .select('id, enrollment_id, organization_id, author_id, note, created_at')
      .eq('enrollment_id', enrollment_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, display_name')
      .eq('organization_id', orgId),
  ])

  type AppRow = {
    id: string
    status: string
    created_at: string
    submitted_at: string | null
    groups: { name: string } | null
  }

  const provider    = providerData as { first_name: string; last_name: string } | null
  const activityLog = (activityRows ?? []) as EnrollmentActivityLog[]
  const applications = (appRows ?? []) as unknown as AppRow[]
  const teamMembers  = (teamRows ?? []) as TeamMember[]

  return (
    <EnrollmentDetailView
      enrollment={enrollmentData as never}
      applications={applications}
      activityLog={activityLog}
      teamMembers={teamMembers}
      providerId={providerId}
      providerName={provider ? `${provider.first_name} ${provider.last_name}` : 'Provider'}
      orgId={orgId}
      userId={userId}
    />
  )
}
