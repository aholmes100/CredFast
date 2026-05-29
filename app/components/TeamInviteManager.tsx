'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
}

interface Props {
  orgId: string
  userId: string
  initialInvitations: Invitation[]
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TeamInviteManager({ orgId, userId, initialInvitations }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>(initialInvitations)
  const [email, setEmail]             = useState('')
  const [role, setRole]               = useState('member')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied]           = useState<string | null>(null)

  const sendInvite = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    setSaving(true)
    setError(null)
    setGeneratedLink(null)

    const { data, error: insertError } = await supabase
      .from('invitations')
      .insert({ organization_id: orgId, email: trimmed, role, invited_by: userId })
      .select('id, email, role, token, expires_at, created_at')
      .single()

    setSaving(false)

    if (insertError) {
      setError('Failed to create invite. Please try again.')
      return
    }

    const link = window.location.origin + '/accept-invite?token=' + data.token
    setGeneratedLink(link)
    setEmail('')
    setRole('member')
    setInvitations(prev => [data as Invitation, ...prev])
  }

  const cancelInvite = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (!deleteError) {
      setInvitations(prev => prev.filter(i => i.id !== id))
      if (generatedLink) setGeneratedLink(null)
    }
  }

  const copyLink = async (token: string) => {
    const link = window.location.origin + '/accept-invite?token=' + token
    await navigator.clipboard.writeText(link)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Invite form */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
          Invite a team member
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            type="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            className="form-select"
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{ width: '120px' }}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={sendInvite}
            disabled={saving || !email.trim()}
            className="btn btn-primary"
          >
            {saving ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626' }}>{error}</div>
        )}
      </div>

      {/* Generated link */}
      {generatedLink && (
        <div style={{
          padding: '14px 16px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginBottom: '6px' }}>
            ✓ Invite created — share this link:
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              readOnly
              value={generatedLink}
              className="form-input"
              style={{ fontSize: '11px', flex: 1, color: '#475569' }}
              onFocus={e => e.target.select()}
            />
            <button
              onClick={() => { navigator.clipboard.writeText(generatedLink); setCopied('generated') }}
              className="btn btn-secondary btn-sm"
            >
              {copied === 'generated' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
            This link expires in 7 days.
          </div>
        </div>
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
            Pending invitations
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {invitations.map(inv => (
              <div key={inv.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: '8px',
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                flexWrap: 'wrap', gap: '8px',
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{inv.email}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                    {inv.role} · expires {fmtDate(inv.expires_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="btn btn-secondary btn-sm"
                  >
                    {copied === inv.token ? '✓ Copied' : 'Copy link'}
                  </button>
                  <button
                    onClick={() => cancelInvite(inv.id)}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
