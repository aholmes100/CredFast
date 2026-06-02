-- ================================================================
-- CredFast Notifications Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  type            text NOT NULL, -- 'expiration_alert' | 'status_change'
  title           text NOT NULL,
  body            text NOT NULL,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_notifications" ON notifications;

CREATE POLICY "org_notifications" ON notifications
  FOR ALL TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_org_created
  ON notifications (organization_id, created_at DESC);
