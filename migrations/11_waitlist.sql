-- ================================================================
-- CredFast Waitlist Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

CREATE TABLE IF NOT EXISTS waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS but allow public (anon) inserts so the landing page
-- signup form works without authentication.
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_waitlist_insert" ON waitlist;

CREATE POLICY "public_waitlist_insert" ON waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);
