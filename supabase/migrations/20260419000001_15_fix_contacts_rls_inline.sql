-- ============================================================
-- 15: Fix contacts RLS — inline subqueries instead of
-- SECURITY DEFINER function wrappers so auth.uid() resolves
-- correctly in the caller's session context.
-- ============================================================

DROP POLICY IF EXISTS "contacts_select" ON contacts;
DROP POLICY IF EXISTS "contacts_insert" ON contacts;
DROP POLICY IF EXISTS "contacts_update" ON contacts;
DROP POLICY IF EXISTS "contacts_delete" ON contacts;

CREATE POLICY "contacts_select"
  ON contacts FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "contacts_insert"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "contacts_update"
  ON contacts FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "contacts_delete"
  ON contacts FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND deactivated_at IS NULL
        AND role IN ('owner', 'admin', 'finance_lead', 'accountant')
    )
  );
