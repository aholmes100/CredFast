'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

type PageState = 'loading' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pageState, setPageState]   = useState<PageState>('loading')
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when it detects the reset token in the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready')
      }
    })

    // Fallback: check if there's already an active session (token already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState('ready')
    })

    // If nothing fires within 3 seconds, the token is missing or invalid
    const timeout = setTimeout(() => {
      setPageState(prev => prev === 'loading' ? 'invalid' : prev)
    }, 3000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setPageState('success')
    setTimeout(() => router.push('/'), 2000)
  }

  const cardStyle = {
    minHeight: '100vh' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#f1f5f9',
  }

  const innerStyle = {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
    padding: '36px 32px',
  }

  if (pageState === 'loading') {
    return (
      <div style={cardStyle}>
        <div style={innerStyle}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '4px' }}>CredFast</div>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>Verifying reset link…</p>
        </div>
      </div>
    )
  }

  if (pageState === 'invalid') {
    return (
      <div style={cardStyle}>
        <div style={innerStyle}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '20px' }}>CredFast</div>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#b91c1c',
            marginBottom: '20px',
            lineHeight: '1.5',
          }}>
            This reset link is invalid or has expired. Reset links are valid for 1 hour.
          </div>
          <Link href="/forgot-password" style={{
            display: 'block', textAlign: 'center', width: '100%',
            padding: '11px 16px', backgroundColor: '#4f46e5', color: '#ffffff',
            border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', boxSizing: 'border-box' as const,
          }}>
            Request a new link
          </Link>
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div style={cardStyle}>
        <div style={innerStyle}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '20px' }}>CredFast</div>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            fontSize: '13px',
            color: '#15803d',
            lineHeight: '1.5',
          }}>
            Password updated. Redirecting you to the dashboard…
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={innerStyle}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '4px' }}>CredFast</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>Set a new password</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} htmlFor="password">
              New password
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
              Confirm new password
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
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#b91c1c',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              width: '100%',
              padding: '11px 16px',
              backgroundColor: loading ? '#a5b4fc' : '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s',
            }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
