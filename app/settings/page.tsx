import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase-server'
import OrgNameEditor from '../components/OrgNameEditor'
import TeamInviteManager from '../components/TeamInviteManager'

interface Member {
  id: string
  email: string | null
  role: string
  created_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const [{ data: org }, { data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from('organizations')
      .select('id, name')
      .eq('id', profile.organization_id)
      .single(),
    supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at'),
    supabase
      .from('invitations')
      .select('id, email, role, token, expires_at, created_at')
      .eq('organization_id', profile.organization_id)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  const members = (memberRows ?? []) as Member[]
  const invitations = (inviteRows ?? []) as Invitation[]
  const isOwner = profile.role === 'owner'

  return (
    <main className="page">
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Organization and team management</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px' }}>

        {/* Organization */}
        <div className="card-lg">
          <p className="section-label">Organization</p>
          {isOwner ? (
            <OrgNameEditor orgId={org?.id ?? ''} initialName={org?.name ?? ''} />
          ) : (
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#0f172a' }}>{org?.name}</div>
          )}
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
            Your role: <strong style={{ color: '#475569', textTransform: 'capitalize' }}>{profile.role}</strong>
          </div>
        </div>

        {/* Team Members */}
        <div className="card-lg">
          <p className="section-label">Team Members</p>

          {/* Members list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '24px' }}>
            {members.map(m => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '8px',
                backgroundColor: m.id === user.id ? '#f5f3ff' : '#f8fafc',
                border: `1px solid ${m.id === user.id ? '#ddd6fe' : '#e2e8f0'}`,
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
                    {m.email ?? '—'}
                    {m.id === user.id && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', color: '#6d28d9', fontWeight: 600 }}>you</span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                    Joined {fmtDate(m.created_at)}
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                  color: m.role === 'owner' ? '#6d28d9' : '#475569',
                  backgroundColor: m.role === 'owner' ? '#f5f3ff' : '#f1f5f9',
                  padding: '2px 8px', borderRadius: '4px',
                }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>

          {/* Invite form — owners only */}
          {isOwner ? (
            <TeamInviteManager
              orgId={profile.organization_id}
              userId={user.id}
              initialInvitations={invitations}
            />
          ) : (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Only the organization owner can invite team members.
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
