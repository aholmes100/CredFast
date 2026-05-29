'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  organization_id: string
  accepted_at: string | null
  expires_at: string
}

type PageState = 'loading' | 'invalid' | 'expired' | 'accepted' | 'wrong-user' | 'ready' | 'join-ready' | 'success'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') ?? ''

  const [pageState, setPageState]   = useState<PageState>('loading')
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string | null>(null)

  // Signup form state
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!token) { setPageState('invalid'); return }

    async function init() {
      // Fetch the invitation
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('id, email, role, token, organization_id, accepted_at, expires_at')
        .eq('token', token)
        .single()

      if (invError || !inv) { setPageState('invalid'); return }

      const invite = inv as Invitation
      setInvitation(invite)

      if (invite.accepted_at) { setPageState('accepted'); return }
      if (new Date(invite.expires_at) < new Date()) { setPageState('expired'); return }

      // Check if there's an active session
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setCurrentEmail(session.user.email ?? null)
        if (session.user.email?.toLowerCase() === invite.email.toLowerCase()) {
          setPageState('join-ready') // logged in as invited email — can accept inline
        } else {
          setPageState('wrong-user') // logged in as different email
        }
      } else {
        setPageState('ready') // not logged in — show signup form
      }
    }

    init()
  }, [token])

  // Accept invite for an already-logged-in user (matching email)
  const acceptInline = async () => {
    if (!invitation) return
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Session expired. Please refresh.'); setSubmitting(false); return }

    const [profileResult, inviteResult] = await Promise.all([
      supabase.from('profiles')
        .update({ organization_id: invitation.organization_id, role: invitation.role })
        .eq('id', user.id),
      supabase.from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token),
    ])

    if (profileResult.error || inviteResult.error) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setPageState('success')
    setTimeout(() => router.push('/'), 2000)
  }

  // Sign up and accept invite via trigger
  const handleSignup = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!invitation) return
    setError(null)

    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }

    setSubmitting(true)
    const { error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: { data: { invite_token: token } },
    })

    if (signUpError) {
      setError(signUpError.message)
      setSubmitting(false)
      return
    }

    setPageState('success')
    setTimeout(() => router.push('/'), 2000)
  }

  // ── Shared layout wrapper ─────────────────────────────────────────
  const wrap = (children: React.ReactNode) => (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', backgroundColor: '#f1f5f9',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px', backgroundColor: '#ffffff',
        borderRadius: '16px', border: '1px solid #e2e8f0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)', padding: '36px 32px',
      }}>
        <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '4px' }}>
          CredFast
        </div>
        {children}
      </div>
    </div>
  )

  if (pageState === 'loading') return wrap(
    <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Verifying invite link…</p>
  )

  if (pageState === 'invalid') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Accept invitation</div>
      <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c', lineHeight: '1.5' }}>
        This invite link is invalid. Please ask your team to send a new one.
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/login" style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none' }}>Back to sign in</Link>
      </div>
    </>
  )

  if (pageState === 'expired') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Accept invitation</div>
      <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c', lineHeight: '1.5' }}>
        This invite link has expired. Invite links are valid for 7 days. Please ask your team to send a new one.
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/login" style={{ fontSize: '13px', color: '#4f46e5', textDecoration: 'none' }}>Back to sign in</Link>
      </div>
    </>
  )

  if (pageState === 'accepted') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Accept invitation</div>
      <div style={{ padding: '14px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
        This invite has already been used. If you have an account, sign in below.
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <Link href="/login" style={{ fontSize: '13px', color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
      </div>
    </>
  )

  if (pageState === 'wrong-user') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Accept invitation</div>
      <div style={{ padding: '14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', fontSize: '13px', color: '#b91c1c', lineHeight: '1.5', marginBottom: '16px' }}>
        You&apos;re signed in as <strong>{currentEmail}</strong>, but this invite is for <strong>{invitation?.email}</strong>.
        Please sign out and click the invite link again.
      </div>
      <button
        onClick={async () => { await supabase.auth.signOut(); router.refresh() }}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        Sign out
      </button>
    </>
  )

  if (pageState === 'join-ready') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Accept invitation</div>
      <div style={{ padding: '14px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', fontSize: '13px', color: '#5b21b6', marginBottom: '20px', lineHeight: '1.5' }}>
        You&apos;re signed in as <strong>{currentEmail}</strong>. Click below to join this organization.
      </div>
      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#b91c1c', marginBottom: '16px' }}>
          {error}
        </div>
      )}
      <button
        onClick={acceptInline}
        disabled={submitting}
        className="btn btn-primary"
        style={{ width: '100%' }}
      >
        {submitting ? 'Joining…' : 'Accept Invitation'}
      </button>
    </>
  )

  if (pageState === 'success') return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>Welcome to CredFast</div>
      <div style={{ padding: '14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '13px', color: '#15803d', lineHeight: '1.5' }}>
        You&apos;re in. Taking you to the dashboard…
      </div>
    </>
  )

  // pageState === 'ready' — show signup form
  return wrap(
    <>
      <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
        You&apos;ve been invited to join CredFast. Create your account to accept.
      </div>

      <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Email</label>
          <input
            type="email"
            className="form-input"
            value={invitation?.email ?? ''}
            readOnly
            style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            className="form-input"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '13px', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            marginTop: '4px', width: '100%', padding: '11px 16px',
            backgroundColor: submitting ? '#a5b4fc' : '#4f46e5',
            color: '#ffffff', border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Creating account…' : 'Create account & join'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
      </div>
    </>
  )
}
