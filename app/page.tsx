'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import WaitlistForm from './components/WaitlistForm'

// ── Inline SVG icons ───────────────────────────────────────────────────────────

function IconClock({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function IconAlert({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function IconTable({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  )
}

function IconDoc({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}

function IconBell({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function IconFlow({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M13 6h3a2 2 0 012 2v7" />
      <line x1="6" y1="9" x2="6" y2="21" />
    </svg>
  )
}

function IconUpload({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconChart({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

// ── Data ───────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    title: 'Hours lost every month',
    description:
      'Filling the same provider information into dozens of different payer forms, one field at a time.',
    Icon: IconClock,
    iconColor: '#4f46e5',
    iconBg: 'rgba(79,70,229,0.1)',
  },
  {
    title: 'Credentials that slip through',
    description:
      'License expirations, malpractice renewals, board certifications — tracked in spreadsheets that don’t alert you.',
    Icon: IconAlert,
    iconColor: '#d97706',
    iconBg: 'rgba(217,119,6,0.1)',
  },
  {
    title: 'Roster season chaos',
    description:
      'Every payer has a different template. Every update means opening the file and doing it manually again.',
    Icon: IconTable,
    iconColor: '#dc2626',
    iconBg: 'rgba(220,38,38,0.1)',
  },
]

const FEATURES = [
  {
    title: 'PDF Form Autofill',
    description:
      'Upload any payer enrollment form, map the fields once, and auto-fill it for every provider with one click.',
    Icon: IconDoc,
    iconColor: '#4f46e5',
    iconBg: 'rgba(79,70,229,0.12)',
  },
  {
    title: 'Roster Generation',
    description:
      'Upload a blank Humana, Anthem, or any payer roster template. Select your providers. Download a filled roster in seconds.',
    Icon: IconTable,
    iconColor: '#16a34a',
    iconBg: 'rgba(22,163,74,0.12)',
  },
  {
    title: 'Expiration Tracking',
    description:
      'Automatic alerts when licenses, malpractice coverage, or board certifications are expiring in the next 30, 60, or 90 days.',
    Icon: IconBell,
    iconColor: '#d97706',
    iconBg: 'rgba(217,119,6,0.12)',
  },
  {
    title: 'Enrollment Pipeline',
    description:
      'Track every application from draft to approved. Notes, tasks, follow-up logs, and activity history in one place.',
    Icon: IconFlow,
    iconColor: '#1d4ed8',
    iconBg: 'rgba(29,78,216,0.12)',
  },
  {
    title: 'Provider Import',
    description:
      'Import provider data from MedTrainer or any spreadsheet. Column mapping handles the differences automatically.',
    Icon: IconUpload,
    iconColor: '#7c3aed',
    iconBg: 'rgba(124,58,237,0.12)',
  },
  {
    title: 'Reporting Dashboard',
    description:
      'Credential expiration reports, enrollment pipeline summaries, provider completeness tracking, and payer enrollment analytics.',
    Icon: IconChart,
    iconColor: '#db2777',
    iconBg: 'rgba(219,39,119,0.12)',
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Add your providers',
    description:
      'Import from MedTrainer or add providers manually. CredFast stores everything needed for enrollment.',
  },
  {
    n: '2',
    title: 'Map your forms once',
    description:
      'Upload payer forms and roster templates. Map the fields to provider data. Never map them again.',
  },
  {
    n: '3',
    title: 'Generate and submit',
    description:
      'Select a provider, pick a form or roster, and download a completed file ready to submit.',
  },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [navSolid, setNavSolid]   = useState(false)
  const sentinelRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setNavSolid(!entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .lp-wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 32px;
        }

        .lp-hero-title {
          font-size: 64px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.035em;
          max-width: 740px;
          text-align: center;
        }

        .lp-section-title {
          font-size: 40px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.025em;
          line-height: 1.15;
          text-align: center;
          margin-bottom: 16px;
        }

        .lp-section-sub {
          font-size: 17px;
          color: #64748b;
          text-align: center;
          max-width: 560px;
          margin: 0 auto 56px;
          line-height: 1.65;
        }

        .lp-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .lp-grid-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .lp-steps {
          display: flex;
          align-items: flex-start;
          gap: 0;
        }

        .lp-cta-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
        }

        .lp-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        @media (max-width: 860px) {
          .lp-wrap { padding: 0 20px; }
          .lp-hero-title { font-size: 40px; }
          .lp-section-title { font-size: 30px; }
          .lp-grid-3 { grid-template-columns: 1fr; }
          .lp-grid-2 { grid-template-columns: 1fr; }
          .lp-steps { flex-direction: column; gap: 32px; }
          .lp-connector { display: none !important; }
          .lp-footer-inner { flex-direction: column; gap: 16px; text-align: center; }
        }

        @media (max-width: 560px) {
          .lp-hero-title { font-size: 32px; }
          .lp-section-title { font-size: 26px; }
        }
      `}</style>

      <div style={{ backgroundColor: '#0f172a', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', WebkitFontSmoothing: 'antialiased' }}>

        {/* Scroll sentinel — sits just below the hero fold */}
        <div ref={sentinelRef} style={{ position: 'absolute', top: '80vh', height: '1px', pointerEvents: 'none' }} />

        {/* ── Fixed Navbar ──────────────────────────────────────── */}
        <nav style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 200,
          backgroundColor: navSolid ? 'rgba(255,255,255,0.97)' : 'transparent',
          backdropFilter: navSolid ? 'blur(12px)' : 'none',
          boxShadow: navSolid ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
          transition: 'background-color 0.25s, box-shadow 0.25s',
        }}>
          <div className="lp-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
            <span style={{
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '-0.025em',
              color: navSolid ? '#0f172a' : '#ffffff',
              transition: 'color 0.25s',
            }}>
              CredFast
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Link href="/login" style={{
                fontSize: '14px',
                fontWeight: 500,
                color: navSolid ? '#475569' : '#94a3b8',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = navSolid ? '#0f172a' : '#ffffff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = navSolid ? '#475569' : '#94a3b8' }}
              >
                Sign In
              </Link>
              <Link href="/signup" style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#ffffff',
                textDecoration: 'none',
                padding: '7px 16px',
                borderRadius: '6px',
                backgroundColor: '#4f46e5',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#4338ca' }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#4f46e5' }}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Section 1: Hero ───────────────────────────────────── */}
        <section style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '100px 32px 80px',
          background: 'radial-gradient(ellipse 80% 70% at 50% 30%, rgba(79,70,229,0.28) 0%, transparent 65%), #0f172a',
          position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(79,70,229,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#a5b4fc',
            marginBottom: '32px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#818cf8', flexShrink: 0 }} />
            Early Access
          </div>

          {/* Headline */}
          <h1 className="lp-hero-title">
            Credentialing workflow,<br />finally automated.
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: '22px',
            fontWeight: 400,
            color: '#94a3b8',
            marginTop: '16px',
            letterSpacing: '-0.01em',
          }}>
            Because your time is better spent elsewhere.
          </p>

          {/* Supporting paragraph */}
          <p style={{
            fontSize: '16px',
            color: '#475569',
            maxWidth: '580px',
            marginTop: '14px',
            lineHeight: '1.7',
          }}>
            CredFast handles the repetitive work — auto-filling payer applications, tracking provider
            credentials, generating rosters, and alerting you before anything expires. Built specifically
            for credentialing coordinators and RCM teams who are tired of doing the same manual tasks
            every month.
          </p>

          {/* CTA buttons */}
          <div className="lp-cta-row" style={{ marginTop: '36px' }}>
            <button
              onClick={() => scrollTo('waitlist')}
              style={{
                padding: '13px 28px',
                fontSize: '15px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'background-color 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#4338ca' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#4f46e5' }}
            >
              Request Early Access
            </button>
            <button
              onClick={() => scrollTo('features')}
              style={{
                padding: '13px 28px',
                fontSize: '15px',
                fontWeight: 500,
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'transparent',
                color: '#e2e8f0',
                cursor: 'pointer',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#ffffff' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#e2e8f0' }}
            >
              See How It Works
            </button>
          </div>

          {/* Social proof */}
          <p style={{ marginTop: '22px', fontSize: '12px', color: '#334155', letterSpacing: '0.01em' }}>
            Currently in early access — join the waitlist
          </p>
        </section>

        {/* ── Section 2: Problem ────────────────────────────────── */}
        <section style={{ backgroundColor: '#ffffff', padding: '88px 0' }}>
          <div className="lp-wrap">
            <p style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#94a3b8',
              textAlign: 'center',
              marginBottom: '48px',
            }}>
              Sound familiar?
            </p>
            <div className="lp-grid-3">
              {PROBLEMS.map(p => (
                <div key={p.title} style={{
                  padding: '28px 24px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: p.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}>
                    <p.Icon color={p.iconColor} />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                    {p.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.65', margin: 0 }}>
                    {p.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Features ───────────────────────────────── */}
        <section id="features" style={{ backgroundColor: '#f8fafc', padding: '96px 0' }}>
          <div className="lp-wrap">
            <h2 className="lp-section-title">
              Everything your credentialing<br />team needs.
            </h2>
            <p className="lp-section-sub">
              One platform for the full credentialing and enrollment lifecycle.
            </p>
            <div className="lp-grid-3">
              {FEATURES.map(f => (
                <div key={f.title} style={{
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '9px',
                    backgroundColor: f.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}>
                    <f.Icon color={f.iconColor} />
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.01em' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.65', margin: 0 }}>
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 4: How It Works ───────────────────────────── */}
        <section id="how-it-works" style={{ backgroundColor: '#ffffff', padding: '96px 0' }}>
          <div className="lp-wrap">
            <h2 className="lp-section-title">
              From setup to filled forms<br />in minutes.
            </h2>
            <p className="lp-section-sub">
              The same data, mapped once, powers every form and roster you need to submit.
            </p>

            <div className="lp-steps" style={{ maxWidth: '900px', margin: '0 auto' }}>
              {STEPS.map((step, i) => (
                <>
                  <div key={step.n} style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
                    <div style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: '#0f172a',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      letterSpacing: '-0.02em',
                    }}>
                      {step.n}
                    </div>
                    <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.65', margin: 0 }}>
                      {step.description}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="lp-connector" style={{
                      width: '60px',
                      height: '2px',
                      backgroundColor: '#e2e8f0',
                      flexShrink: 0,
                      marginTop: '26px',
                    }} />
                  )}
                </>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: Waitlist CTA ───────────────────────────── */}
        <section id="waitlist" style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% 50%, rgba(79,70,229,0.2) 0%, transparent 70%), #0f172a',
          padding: '96px 0',
          textAlign: 'center',
        }}>
          <div className="lp-wrap">
            <h2 style={{
              fontSize: '40px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.025em',
              lineHeight: 1.15,
              marginBottom: '16px',
            }}>
              Join the CredFast early access waitlist.
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              maxWidth: '520px',
              margin: '0 auto 40px',
              lineHeight: '1.7',
            }}>
              We&apos;re working with a small group of credentialing teams to shape the product. Early access
              members get priority onboarding and locked-in founding pricing.
            </p>

            <WaitlistForm />

            <p style={{ marginTop: '16px', fontSize: '12px', color: '#334155', letterSpacing: '0.01em' }}>
              No credit card required. No commitment.
            </p>
          </div>
        </section>

        {/* ── Section 6: Footer ─────────────────────────────────── */}
        <footer style={{
          backgroundColor: '#080e1a',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '24px 0',
        }}>
          <div className="lp-wrap">
            <div className="lp-footer-inner">
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
                CredFast
              </span>
              <span style={{ fontSize: '12px', color: '#334155' }}>
                &copy; 2026 CredFast. All rights reserved.
              </span>
              <div style={{ display: 'flex', gap: '20px' }}>
                <Link href="/login" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#475569' }}
                >
                  Sign In
                </Link>
                <Link href="/signup" style={{ fontSize: '13px', color: '#475569', textDecoration: 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#475569' }}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}
