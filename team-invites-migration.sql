-- ================================================================
-- CredFast Team Invites Migration
-- Run in Supabase SQL Editor. Safe to re-run.
-- ================================================================

-- 1. Add email column to profiles (populated by trigger going forward)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;

-- 2. Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'member',
  token           uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by      uuid REFERENCES auth.users(id),
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_invitations"        ON invitations;
DROP POLICY IF EXISTS "org_insert_invitations"    ON invitations;
DROP POLICY IF EXISTS "org_delete_invitations"    ON invitations;
DROP POLICY IF EXISTS "accept_invite_by_token"    ON invitations;

-- Anyone can SELECT invitations (tokens are hard-to-guess UUIDs)
CREATE POLICY "select_invitations" ON invitations
  FOR SELECT USING (true);

-- Org members can INSERT invitations for their own org
CREATE POLICY "org_insert_invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Org members can DELETE (cancel) invitations for their own org
CREATE POLICY "org_delete_invitations" ON invitations
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Authenticated users can accept an invite (set accepted_at) by token
CREATE POLICY "accept_invite_by_token" ON invitations
  FOR UPDATE TO authenticated
  USING (accepted_at IS NULL AND expires_at > now())
  WITH CHECK (accepted_at IS NOT NULL);

-- 4. Update handle_new_user trigger to handle invite tokens and store email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id   uuid;
  invite_token uuid;
  invite_org   uuid;
  invite_role  text;
BEGIN
  -- Check for invite token in user metadata
  BEGIN
    invite_token := (NEW.raw_user_meta_data->>'invite_token')::uuid;
  EXCEPTION WHEN others THEN
    invite_token := NULL;
  END;

  IF invite_token IS NOT NULL THEN
    -- Look up a valid, unaccepted invitation
    SELECT organization_id, role INTO invite_org, invite_role
    FROM public.invitations
    WHERE token = invite_token
      AND accepted_at IS NULL
      AND expires_at > now();

    IF invite_org IS NOT NULL THEN
      -- Join the existing org
      INSERT INTO public.profiles (id, organization_id, role, email)
      VALUES (NEW.id, invite_org, COALESCE(invite_role, 'member'), NEW.email);

      -- Mark invitation accepted
      UPDATE public.invitations
      SET accepted_at = now()
      WHERE token = invite_token;

      RETURN NEW;
    END IF;
  END IF;

  -- Normal signup — create a new org
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'org_name', 'My Organization'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, organization_id, role, email)
  VALUES (NEW.id, new_org_id, 'owner', NEW.email);

  RETURN NEW;
END;
$$;

-- Trigger already exists — this replaces just the function body.
-- If trigger doesn't exist yet, create it:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END;
$$;
