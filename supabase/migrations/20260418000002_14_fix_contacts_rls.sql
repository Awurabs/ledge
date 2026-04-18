-- ============================================================
-- 14: Fix contacts RLS — explicit per-command policies
-- The original FOR ALL USING pattern doesn't properly cover
-- INSERT; replaced with explicit INSERT WITH CHECK policy.
-- ============================================================

DROP POLICY IF EXISTS "finance_manage_contacts"    ON contacts;
DROP POLICY IF EXISTS "org_member_select_contacts" ON contacts;

-- Any org member can read contacts
CREATE POLICY "contacts_select"
  ON contacts FOR SELECT
  USING (public.is_org_member(organization_id));

-- Any org member can insert contacts for their own org
CREATE POLICY "contacts_insert"
  ON contacts FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

-- Any org member can update contacts in their org
CREATE POLICY "contacts_update"
  ON contacts FOR UPDATE
  USING  (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- Only finance roles can archive/delete contacts
CREATE POLICY "contacts_delete"
  ON contacts FOR DELETE
  USING (
    public.my_org_role(organization_id)
      IN ('owner', 'admin', 'finance_lead', 'accountant')
  );
