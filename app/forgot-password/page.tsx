'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    })

    setLoading(false)
    if (resetError) {
      setError('Something went wrong. Please try again.')
      return
    }
    setSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5f9',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
        padding: '36px 32px',
      }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontWeight: 700, fontSize: '22px', color: '#0f172a', marginBottom: '4px' }}>
            CredFast
          </div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {sent ? 'Check your email' : 'Reset your password'}
          </div>
        </div>

        {sent ? (
          <div>
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#15803d',
              marginBottom: '20px',
              lineHeight: '1.5',
            }}>
              We sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the link to set a new password.
            </div>
            <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
              Didn&apos;t get it? Check your spam folder or{' '}
              <button
                onClick={() => { setSent(false); setEmail('') }}
                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '12px', padding: 0 }}
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
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
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          <Link href="/login" style={{ color: '#4f46e5', fontWeight: 600, textDecoration: 'none' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
