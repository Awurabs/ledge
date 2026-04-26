-- ── Fix org_members SELECT RLS — no recursion ────────────────────────────────
-- Replaces the broken self-referential policy from migration 37.
-- Uses my_org_role() which is SECURITY DEFINER and bypasses RLS internally,
-- so querying organization_members inside it does NOT trigger this policy again.
--
-- Result: any authenticated user who belongs to an org (i.e. my_org_role returns
-- a non-null role) can see ALL members of that org.

DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;

CREATE POLICY "org_members_select"
  ON public.organization_members FOR SELECT TO authenticated
  USING (my_org_role(organization_id) IS NOT NULL);
