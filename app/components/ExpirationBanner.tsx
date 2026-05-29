'use client'

import { useState } from 'react'
import Link from 'next/link'

export type ExpirationAlert = {
  providerId: string
  providerName: string
  credential: string
  date: string
  daysUntil: number
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExpirationBanner({ alerts }: { alerts: ExpirationAlert[] }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || alerts.length === 0) return null

  const hasExpired = alerts.some(a => a.daysUntil < 0)
  const hasSoon    = alerts.some(a => a.daysUntil >= 0 && a.daysUntil <= 30)

  const borderColor = hasExpired ? '#fecaca' : hasSoon ? '#fed7aa' : '#fde68a'
  const bgColor     = hasExpired ? '#fef2f2' : hasSoon ? '#fff7ed' : '#fffbeb'
  const headingIcon = hasExpired ? '🔴' : hasSoon ? '🟠' : '🟡'

  return (
    <div style={{
      marginBottom: '20px',
      borderRadius: '10px',
      border: `1px solid ${borderColor}`,
      backgroundColor: bgColor,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            {headingIcon} Credential Expiration Alert{alerts.length !== 1 ? 's' : ''} ({alerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {alerts.map((a, i) => {
              const expired = a.daysUntil < 0
              const soon    = a.daysUntil >= 0 && a.daysUntil <= 30
              const icon    = expired ? '🔴' : soon ? '🟠' : '🟡'
              const color   = expired ? '#dc2626' : soon ? '#c2410c' : '#92400e'
              return (
                <div key={i} style={{ fontSize: '12px', color, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  <span>{icon}</span>
                  <Link href={`/providers/${a.providerId}`} style={{ fontWeight: 700, color, textDecoration: 'underline' }}>
                    {a.providerName}
                  </Link>
                  <span style={{ color: '#64748b' }}>—</span>
                  <span>
                    {a.credential}
                    {expired
                      ? ` expired ${fmtDate(a.date)}`
                      : ` expires in ${a.daysUntil} day${a.daysUntil !== 1 ? 's' : ''} (${fmtDate(a.date)})`
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '20px', lineHeight: 1, padding: 0, flexShrink: 0 }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
