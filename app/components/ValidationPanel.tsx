'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Provider, Group, Location, ValidationIssue } from '../types'

interface Props {
  providerId: string
  groupId:    string
}

// ── Validation rules ──────────────────────────────────────────────────────────

function validateProvider(p: Provider): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const err  = (field: string, label: string) => issues.push({ field, label, severity: 'error' })
  const warn = (field: string, label: string) => issues.push({ field, label, severity: 'warning' })

  if (!p.npi)                   err ('npi',             'NPI number is missing')
  if (!p.date_of_birth)         err ('date_of_birth',   'Date of birth is missing')
  if (!p.specialty)             warn('specialty',       'Specialty not set')
  if (!p.taxonomy_code)         warn('taxonomy_code',   'Taxonomy code not set')
  if (!p.license_number)        err ('license_number',  'License number is missing')
  if (!p.license_state)         err ('license_state',   'License state is missing')
  if (!p.license_expiration)    warn('license_expiration', 'License expiration date not set')
  if (!p.caqh_number)           warn('caqh_number',     'CAQH number not set')
  if (!p.malpractice_carrier)   err ('malpractice_carrier', 'Malpractice carrier is missing')
  if (!p.malpractice_policy)    err ('malpractice_policy',  'Malpractice policy number is missing')
  if (!p.malpractice_expiration) warn('malpractice_expiration', 'Malpractice expiration not set')
  if (!p.malpractice_per_occurrence) warn('malpractice_per_occurrence', 'Malpractice per-occurrence limit not set')

  return issues
}

function validateGroup(g: Group): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const err  = (field: string, label: string) => issues.push({ field, label, severity: 'error' })
  const warn = (field: string, label: string) => issues.push({ field, label, severity: 'warning' })

  if (!g.tax_id)                        err ('tax_id',    'Group Tax ID (EIN) is missing')
  if (!g.group_npi)                     err ('group_npi', 'Group NPI is missing')
  if (!g.authorized_official_name)      warn('authorized_official_name',  'Authorized official name not set')
  if (!g.authorized_official_title)     warn('authorized_official_title', 'Authorized official title not set')
  if (!g.authorized_official_phone)     warn('authorized_official_phone', 'Authorized official phone not set')

  return issues
}

function validateLocation(l: Location): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const err = (field: string, label: string) => issues.push({ field, label, severity: 'error' })

  if (!l.address_1) err('address_1', `Location "${l.name}": street address is missing`)
  if (!l.city)      err('city',      `Location "${l.name}": city is missing`)
  if (!l.state)     err('state',     `Location "${l.name}": state is missing`)
  if (!l.zip)       err('zip',       `Location "${l.name}": ZIP code is missing`)
  if (!l.phone)     err('phone',     `Location "${l.name}": phone number is missing`)

  return issues
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ValidationPanel({ providerId, groupId }: Props) {
  const [issues,  setIssues]  = useState<ValidationIssue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function run() {
      const [
        { data: providerData },
        { data: groupData },
        { data: locationRows },
      ] = await Promise.all([
        supabase.from('providers').select('*').eq('id', providerId).single(),
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('provider_group_locations')
          .select('location_id, locations(*)')
          .eq('provider_id', providerId)
          .eq('group_id', groupId)
          .eq('is_active', true),
      ])

      const all: ValidationIssue[] = []
      if (providerData) all.push(...validateProvider(providerData as Provider))
      if (groupData)    all.push(...validateGroup(groupData as Group))
      for (const row of (locationRows ?? [])) {
        const loc = (row as unknown as { locations: Location | null }).locations
        if (loc) all.push(...validateLocation(loc))
      }

      setIssues(all)
      setLoading(false)
    }
    run()
  }, [providerId, groupId])

  if (loading) {
    return <p style={{ fontSize: '13px', color: '#94a3b8' }}>Checking…</p>
  }

  const errors   = issues.filter((i) => i.severity === 'error')
  const warnings = issues.filter((i) => i.severity === 'warning')

  if (issues.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>✓</span>
        <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
          All required fields are complete. Ready to submit.
        </span>
      </div>
    )
  }

  return (
    <div>
      {errors.length > 0 && (
        <div style={{ marginBottom: warnings.length > 0 ? '12px' : 0 }}>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#b91c1c', marginBottom: '8px' }}>
            {errors.length} Error{errors.length !== 1 ? 's' : ''} — must fix before submitting
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {errors.map((i, idx) => (
              <li key={idx} style={{
                fontSize: '12px', color: '#b91c1c',
                backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: '6px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ flexShrink: 0 }}>✗</span> {i.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a16207', marginBottom: '8px' }}>
            {warnings.length} Warning{warnings.length !== 1 ? 's' : ''} — recommended fields
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {warnings.map((i, idx) => (
              <li key={idx} style={{
                fontSize: '12px', color: '#a16207',
                backgroundColor: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '6px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span> {i.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
