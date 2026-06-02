'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WaitlistForm() {
  const [email, setEmail]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSubmitting(true)
    setError(null)

    const { error: dbError } = await supabase
      .from('waitlist')
      .insert({ email: trimmed })

    if (dbError) {
      // 23505 = unique_violation — already on the list
      if (dbError.code === '23505') {
        setSubmitted(true)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } else {
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '20px 0',
        fontSize: '16px',
        fontWeight: 500,
        color: '#a5b4fc',
        letterSpacing: '-0.01em',
      }}>
        You&apos;re on the list. We&apos;ll be in touch soon.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={submitting}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '15px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: '#ffffff',
            outline: 'none',
            minWidth: 0,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.6)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '12px 24px',
            fontSize: '15px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            cursor: submitting ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s',
            opacity: submitting ? 0.7 : 1,
          }}
          onMouseEnter={e => { if (!submitting) e.currentTarget.style.backgroundColor = '#4338ca' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#4f46e5' }}
        >
          {submitting ? 'Sending…' : 'Request Access'}
        </button>
      </div>
      {error && (
        <p style={{ marginTop: '8px', fontSize: '13px', color: '#f87171', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </form>
  )
}
