import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Service-role client bypasses RLS — only used server-side in this webhook handler
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId   = session.metadata?.organization_id
        if (!orgId) break

        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id ?? null

        // Retrieve the subscription to get period end and price
        let priceId: string | null = null
        let periodEnd: string | null = null
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          priceId   = sub.items.data[0]?.price.id ?? null
          periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()
        }

        const isFoundingMember = (session.total_details?.amount_discount ?? 0) > 0

        await supabaseAdmin
          .from('organizations')
          .update({
            stripe_subscription_id:  subscriptionId,
            stripe_price_id:         priceId,
            subscription_status:     'active',
            subscription_period_end: periodEnd,
            is_founding_member:      isFoundingMember,
          })
          .eq('id', orgId)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.organization_id
        if (!orgId) break

        const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString()

        await supabaseAdmin
          .from('organizations')
          .update({
            subscription_status:     sub.status === 'active' ? 'active' : sub.status,
            stripe_price_id:         sub.items.data[0]?.price.id ?? null,
            subscription_period_end: periodEnd,
          })
          .eq('id', orgId)
        break
      }

      case 'customer.subscription.deleted': {
        const sub   = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.organization_id
        if (!orgId) break

        await supabaseAdmin
          .from('organizations')
          .update({ subscription_status: 'cancelled' })
          .eq('id', orgId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice   = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (!customerId) break

        await supabaseAdmin
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        // Unhandled event — ignore
        break
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
