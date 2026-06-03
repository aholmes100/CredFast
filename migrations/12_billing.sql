-- ================================================================
-- CredFast Billing Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id       text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id   text,
  ADD COLUMN IF NOT EXISTS stripe_price_id          text,
  ADD COLUMN IF NOT EXISTS subscription_status      text DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_period_end  timestamptz,
  ADD COLUMN IF NOT EXISTS is_founding_member       boolean DEFAULT false;
