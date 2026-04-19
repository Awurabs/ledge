-- ============================================================
-- 24: Fix organization_members RLS recursion
--
-- Root cause: migration 23 replaced the org_members_select
-- policy with a self-referential subquery:
--   organization_id IN (
--     SELECT organization_id FROM organization_members
--     WHERE user_id = auth.uid()
--   )
-- This causes infinite recursion in PostgREST → loadUserData
-- returns null → orgId = null → ALL app queries disabled.
--
-- Fix: simplest possible non-recursive policy.
-- Each user can see their own membership row.
-- This is sufficient for:
--   1. AuthContext.loadUserData (queries WHERE user_id = userId)
--   2. Every other table's RLS subquery pattern:
--      SELECT organization_id FROM organization_members
--      WHERE user_id = auth.uid() AND deactivated_at IS NULL
-- ============================================================

DROP POLICY IF EXISTS "org_members_select" ON organization_members;

CREATE POLICY "org_members_select"
  ON organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
