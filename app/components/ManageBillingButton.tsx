'use client'

import { useState } from 'react'

export default function ManageBillingButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/create-portal-session', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to open billing portal')
      }
      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="btn btn-primary"
        style={{ opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Loading…' : 'Manage Billing'}
      </button>
      {error && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{error}</p>
      )}
    </div>
  )
}
