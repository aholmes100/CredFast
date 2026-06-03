'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import NotificationBell, { type AppNotification } from './NotificationBell'

const NAV_GROUPS = [
  {
    label: null,
    links: [
      { href: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    label: 'Credentialing',
    links: [
      { href: '/providers',    label: 'Providers' },
      { href: '/import',      label: 'Import' },
      { href: '/groups',       label: 'Groups' },
      { href: '/locations',    label: 'Locations' },
      { href: '/assignments',  label: 'Assignments' },
    ],
  },
  {
    label: 'Enrollment',
    links: [
      { href: '/applications', label: 'Applications' },
      { href: '/reports',      label: 'Reports' },
      { href: '/payers',       label: 'Payers' },
      { href: '/payer-forms',  label: 'Payer Forms' },
      { href: '/rosters',     label: 'Rosters' },
    ],
  },
  {
    label: 'Files',
    links: [
      { href: '/documents', label: 'Documents' },
    ],
  },
]

interface SidebarProps {
  initialNotifications: AppNotification[]
}

export default function Sidebar({ initialNotifications }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      style={{
        width: '210px',
        minWidth: '210px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a', letterSpacing: '-0.02em' }}>
              CredFast
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Enrollment Platform
            </div>
          </div>
          <NotificationBell initialNotifications={initialNotifications} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 8px 12px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="nav-section-label">{group.label}</div>
            )}
            {group.links.map(({ href, label }) => {
              const isActive =
                href === '/' ? pathname === '/' : pathname.startsWith(href)

              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: 'block',
                    padding: '7px 12px',
                    marginBottom: '1px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#4f46e5' : '#475569',
                    backgroundColor: isActive ? '#eef2ff' : 'transparent',
                    textDecoration: 'none',
                    transition: 'background-color 0.1s, color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#f8fafc'
                      e.currentTarget.style.color = '#0f172a'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = '#475569'
                    }
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Settings + Billing */}
      <div style={{ padding: '8px 8px 4px', borderTop: '1px solid #e2e8f0' }}>
        {[
          { href: '/settings', label: 'Settings' },
          { href: '/billing',  label: 'Billing'  },
        ].map(({ href, label }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'block',
                padding: '7px 12px',
                marginBottom: '1px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#4f46e5' : '#475569',
                backgroundColor: isActive ? '#eef2ff' : 'transparent',
                textDecoration: 'none',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.color = '#0f172a' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#475569' } }}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px' }}>Pollux Internal</div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#64748b',
            backgroundColor: 'transparent',
            border: '1px solid #e2e8f0',
            borderRadius: '5px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
