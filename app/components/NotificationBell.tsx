'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

interface Props {
  initialNotifications: AppNotification[]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TYPE_ICON: Record<string, string> = {
  expiration_alert: '⚠️',
  status_change:    '📋',
}

export default function NotificationBell({ initialNotifications }: Props) {
  const [open, setOpen]     = useState(false)
  const [mounted, setMounted] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications)

  useEffect(() => setMounted(true), [])

  const unread = notifications.filter(n => !n.read_at).length

  const markRead = async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read_at: now }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: now } : n))
  }

  const markAllRead = async () => {
    const now = new Date().toISOString()
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ read_at: now }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
  }

  return (
    <>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '4px', borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#4f46e5' : '#64748b',
          backgroundColor: open ? '#eef2ff' : 'transparent',
          transition: 'all 0.1s',
        }}
        title="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            minWidth: '14px', height: '14px', borderRadius: '9999px',
            backgroundColor: '#dc2626', color: '#fff',
            fontSize: '9px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Portal: backdrop + panel rendered into document.body to escape sidebar stacking context */}
      {open && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, left: '210px', width: '340px', height: '100vh',
            backgroundColor: '#fff', borderRight: '1px solid #e2e8f0',
            boxShadow: '4px 0 24px rgba(0,0,0,0.08)',
            zIndex: 1000, display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div style={{
              padding: '16px 16px 12px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Notifications</div>
                {unread > 0 && (
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                    {unread} unread
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: '11px', color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 500 }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', lineHeight: 1, padding: 0 }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>🔔</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>No notifications yet</div>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.read_at) markRead(n.id) }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: n.read_at ? '#fff' : '#f5f3ff',
                      cursor: n.read_at ? 'default' : 'pointer',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>
                        {TYPE_ICON[n.type] ?? '🔔'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>
                          {n.title}
                          {!n.read_at && (
                            <span style={{ marginLeft: '6px', display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4f46e5', verticalAlign: 'middle' }} />
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', marginBottom: '4px' }}>
                          {n.body}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {relativeTime(n.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
