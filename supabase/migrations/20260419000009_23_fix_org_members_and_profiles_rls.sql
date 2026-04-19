-- ============================================================
-- 23: Fix organization_members + profiles RLS
--
-- Root cause: nested joins in reimbursements (and elsewhere)
-- were failing because:
-- 1. organization_members SELECT used is_org_member() SECURITY
--    DEFINER function (broken in PostgREST)
-- 2. profiles SELECT only allowed id = auth.uid() — so any
--    query joining another member's profile returned null,
--    causing the parent query to appear empty
-- ============================================================

-- Fix organization_members SELECT
DROP POLICY IF EXISTS "members: org read" ON organization_members;

CREATE POLICY "org_members_select"
  ON organization_members FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

-- Fix profiles SELECT — allow reading profiles of org members
DROP POLICY IF EXISTS "profiles: own row" ON profiles;

CREATE POLICY "profiles_select"
  ON profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR
    id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members om2
        WHERE om2.user_id = auth.uid() AND om2.deactivated_at IS NULL
      )
      AND deactivated_at IS NULL
    )
  );

-- Keep write access to own profile only
CREATE POLICY "profiles_insert"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
