'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// ── Plan definitions ───────────────────────────────────────────────────────────

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    price: 99,
    foundingPrice: 59,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!,
    features: [
      'Up to 20 providers',
      '2 team members',
      'PDF form autofill',
      'Roster generation',
      'Expiration tracking',
      'Email support',
    ],
    highlight: false,
  },
  {
    slug: 'practice',
    name: 'Practice',
    price: 199,
    foundingPrice: 119,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRACTICE!,
    features: [
      'Up to 75 providers',
      '5 team members',
      'Everything in Starter',
      'Enrollment pipeline',
      'Reporting dashboard',
      'Priority support',
    ],
    highlight: true,
  },
  {
    slug: 'professional',
    name: 'Professional',
    price: 399,
    foundingPrice: 239,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL!,
    features: [
      'Unlimited providers',
      'Unlimited team members',
      'Everything in Practice',
      'Document storage',
      'Provider import',
      'Dedicated onboarding',
    ],
    highlight: false,
  },
]

// ── Check icon SVG ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function CheckIconMuted() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  const handleGetStarted = async (plan: typeof PLANS[0]) => {
    setError(null)
    setLoadingSlug(plan.slug)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = `/signup?plan=${plan.slug}`
        return
      }

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to create checkout session')
      }

      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoadingSlug(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Minimal nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 32px' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '16px', color: '#ffffff', textDecoration: 'none', letterSpacing: '-0.025em' }}>
            CredFast
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', textDecoration: 'none', padding: '7px 16px', borderRadius: '6px', backgroundColor: '#4f46e5' }}>
              Go to Dashboard
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link href="/login" style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'none', padding: '6px 14px', borderRadius: '6px' }}>
                Sign In
              </Link>
              <Link href="/signup" style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', textDecoration: 'none', padding: '7px 16px', borderRadius: '6px', backgroundColor: '#4f46e5' }}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '64px 32px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
            marginBottom: '16px',
          }}>
            Simple, transparent pricing.
          </h1>
          <p style={{ fontSize: '17px', color: '#64748b', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>
            Everything your credentialing team needs, at a price that makes sense.
          </p>
        </div>

        {/* Founding member banner */}
        <div style={{
          maxWidth: '680px',
          margin: '0 auto 48px',
          padding: '14px 24px',
          borderRadius: '10px',
          backgroundColor: 'rgba(79,70,229,0.15)',
          border: '1px solid rgba(99,102,241,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#818cf8', flexShrink: 0 }} />
          <p style={{ fontSize: '14px', color: '#c7d2fe', margin: 0, lineHeight: 1.5 }}>
            <strong style={{ color: '#e0e7ff' }}>Founding member pricing</strong> — first 20 customers lock in 40% off forever.
            Use promo code at checkout.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            maxWidth: '680px',
            margin: '0 auto 24px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.3)',
            fontSize: '13px',
            color: '#fca5a5',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Pricing cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          alignItems: 'start',
        }}>
          {PLANS.map(plan => (
            <div
              key={plan.slug}
              style={{
                borderRadius: '16px',
                border: plan.highlight ? '2px solid #4f46e5' : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: plan.highlight ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.03)',
                padding: '28px 24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Most popular badge */}
              {plan.highlight && (
                <div style={{
                  position: 'absolute',
                  top: '-13px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#4f46e5',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}

              {/* Plan name */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '16px' }}>
                  {plan.name}
                </div>

                {/* Pricing */}
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    ${plan.price}
                  </span>
                  <span style={{ fontSize: '14px', color: '#64748b', marginLeft: '4px' }}>/mo</span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#a5b4fc',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{
                    padding: '1px 7px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(99,102,241,0.2)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    Founding ${plan.foundingPrice}/mo
                  </span>
                  <span style={{ color: '#334155' }}>with promo code</span>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '20px' }} />

              {/* Features */}
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: plan.highlight ? '#c7d2fe' : '#94a3b8' }}>
                    {plan.highlight ? <CheckIcon /> : <CheckIconMuted />}
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <button
                onClick={() => handleGetStarted(plan)}
                disabled={loadingSlug !== null}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: plan.highlight ? '#4f46e5' : 'transparent',
                  color: plan.highlight ? '#ffffff' : '#e2e8f0',
                  cursor: loadingSlug !== null ? 'wait' : 'pointer',
                  opacity: loadingSlug !== null && loadingSlug !== plan.slug ? 0.5 : 1,
                  transition: 'background-color 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => {
                  if (!loadingSlug) {
                    e.currentTarget.style.backgroundColor = plan.highlight ? '#4338ca' : 'rgba(255,255,255,0.06)'
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = plan.highlight ? '#4f46e5' : 'transparent'
                }}
              >
                {loadingSlug === plan.slug ? 'Loading…' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{ textAlign: 'center', marginTop: '36px', fontSize: '13px', color: '#334155' }}>
          All plans include a 14-day free trial. No credit card required to start.
        </p>
      </div>
    </div>
  )
}
