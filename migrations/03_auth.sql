-- ================================================================
-- CredFast Auth Migration: organizations, profiles, RLS
-- Run this in the Supabase SQL Editor BEFORE launching the app
-- Safe to re-run (uses IF NOT EXISTS and DROP IF EXISTS)
-- ================================================================

-- 1. Organizations table (each customer/tenant is an org)
CREATE TABLE IF NOT EXISTS organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- 2. Profiles table (links a logged-in user to their organization)
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  role            text NOT NULL DEFAULT 'owner',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. Add organization_id to all core tables (nullable — backfill after first login)
ALTER TABLE providers               ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE groups                  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE locations               ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE payers                  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE enrollment_applications ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE payer_forms             ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);
ALTER TABLE provider_group_locations ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id);

-- 4. Enable Row Level Security on all tables
ALTER TABLE organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payers                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_forms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_group_locations   ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies so this is safe to re-run
DROP POLICY IF EXISTS "org_own"    ON organizations;
DROP POLICY IF EXISTS "org_insert" ON organizations;
DROP POLICY IF EXISTS "org_update" ON organizations;
DROP POLICY IF EXISTS "profile_own" ON profiles;
DROP POLICY IF EXISTS "org_access" ON providers;
DROP POLICY IF EXISTS "org_access" ON groups;
DROP POLICY IF EXISTS "org_access" ON locations;
DROP POLICY IF EXISTS "org_access" ON payers;
DROP POLICY IF EXISTS "org_access" ON enrollment_applications;
DROP POLICY IF EXISTS "org_access" ON payer_forms;
DROP POLICY IF EXISTS "org_access" ON provider_group_locations;

-- 6. RLS Policies

-- Organizations: any authenticated user may INSERT (needed during signup before profile exists).
-- SELECT and UPDATE are restricted to the user's own org.
CREATE POLICY "org_insert" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "org_own" ON organizations
  FOR SELECT
  USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_update" ON organizations
  FOR UPDATE
  USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Profiles: users can only see/modify their own profile
CREATE POLICY "profile_own" ON profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- All core tables: org isolation — users only see rows belonging to their org
CREATE POLICY "org_access" ON providers
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON groups
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON locations
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON payers
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON enrollment_applications
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON payer_forms
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "org_access" ON provider_group_locations
  FOR ALL
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ================================================================
-- BACKFILL — run this AFTER signing up for your account
-- ================================================================
-- After you create your account at /signup, find your org ID by running:
--   SELECT id, name FROM organizations;
--
-- Then uncomment and run these lines, replacing YOUR_ORG_ID:
-- ================================================================

-- UPDATE providers               SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE groups                  SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE locations               SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE payers                  SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE enrollment_applications SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE payer_forms             SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
-- UPDATE provider_group_locations SET organization_id = 'YOUR_ORG_ID' WHERE organization_id IS NULL;
