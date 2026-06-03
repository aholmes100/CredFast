import Link from 'next/link'
import { createClient } from '../lib/supabase-server'
import ManageBillingButton from '../components/ManageBillingButton'

// Map Stripe price IDs to plan names
const PLAN_NAMES: Record<string, string> = {
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER!]:      'Starter',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PRACTICE!]:     'Practice',
  [process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFESSIONAL!]: 'Professional',
}

interface OrgBilling {
  stripe_customer_id:      string | null
  stripe_subscription_id:  string | null
  stripe_price_id:         string | null
  subscription_status:     string | null
  subscription_period_end: string | null
  is_founding_member:      boolean | null
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active:   { label: 'Active',    bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  past_due: { label: 'Past Due',  bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  cancelled:{ label: 'Cancelled', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  inactive: { label: 'Inactive',  bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function BillingPage() {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .single()

  const orgId = (profile as { organization_id?: string } | null)?.organization_id

  const { data: orgRaw } = orgId
    ? await supabase
        .from('organizations')
        .select('stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, subscription_period_end, is_founding_member')
        .eq('id', orgId)
        .single()
    : { data: null }

  const org = orgRaw as OrgBilling | null

  const status    = org?.subscription_status ?? 'inactive'
  const statusCfg = STATUS_STYLES[status] ?? STATUS_STYLES.inactive
  const planName  = org?.stripe_price_id ? (PLAN_NAMES[org.stripe_price_id] ?? 'Unknown Plan') : null
  const hasActive = status === 'active' || status === 'past_due'

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage your subscription and payment method</p>
        </div>
        {hasActive && <ManageBillingButton />}
      </div>

      {/* Success banner */}
      {/* (success=true is handled client-side via URL param if needed) */}

      {/* Subscription card */}
      <div className="card-lg" style={{ marginBottom: '16px' }}>
        <p className="section-label" style={{ marginBottom: '16px' }}>Current Plan</p>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                {planName ?? 'No active plan'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '9999px',
                backgroundColor: statusCfg.bg,
                color: statusCfg.color,
                border: `1px solid ${statusCfg.border}`,
                textTransform: 'capitalize',
              }}>
                {statusCfg.label}
              </span>
              {org?.is_founding_member && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  backgroundColor: '#eef2ff',
                  color: '#4f46e5',
                  border: '1px solid #c7d2fe',
                }}>
                  Founding Member
                </span>
              )}
            </div>

            {org?.subscription_period_end && (
              <div style={{ fontSize: '13px', color: '#64748b' }}>
                {status === 'cancelled' ? 'Access through' : 'Next billing date'}:{' '}
                <strong style={{ color: '#0f172a' }}>{fmtDate(org.subscription_period_end)}</strong>
              </div>
            )}

            {!hasActive && (
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Subscribe to unlock the full CredFast platform.
              </div>
            )}
          </div>

          {!hasActive && (
            <Link href="/pricing" className="btn btn-primary">
              Upgrade
            </Link>
          )}
        </div>
      </div>

      {/* Payment method note */}
      {hasActive && (
        <div className="card" style={{ backgroundColor: '#f8fafc' }}>
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
            To update your payment method, cancel, or change your plan, click{' '}
            <strong>Manage Billing</strong> above. You will be redirected to the Stripe customer portal.
          </p>
        </div>
      )}
    </main>
  )
}
