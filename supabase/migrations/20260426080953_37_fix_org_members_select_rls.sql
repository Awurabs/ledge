-- ── Fix org_members SELECT RLS (attempt 1 — superseded by migration 38) ───────
-- NOTE: This policy caused infinite recursion because it queries the same table
-- it is protecting. It was immediately replaced by migration 38.
-- Kept here only for migration history integrity.

DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;

-- ⚠️  BROKEN: self-referential subquery causes infinite recursion
-- CREATE POLICY "org_members_select"
--   ON public.organization_members FOR SELECT TO authenticated
--   USING (
--     organization_id IN (
--       SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
--     )
--   );

-- Replaced immediately by migration 38 which uses my_org_role() instead.
