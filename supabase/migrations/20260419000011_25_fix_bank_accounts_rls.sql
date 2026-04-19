-- ============================================================
-- 25: Fix bank_accounts RLS
-- Both policies used broken SECURITY DEFINER functions.
-- Replace with inline auth.uid() subqueries.
-- ============================================================

DROP POLICY IF EXISTS "bank_acc: finance write" ON bank_accounts;
DROP POLICY IF EXISTS "bank_acc: member read"   ON bank_accounts;

-- Any org member can read accounts
CREATE POLICY "bank_accounts_select"
  ON bank_accounts FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

-- Any org member can insert/update/delete accounts
CREATE POLICY "bank_accounts_insert"
  ON bank_accounts FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "bank_accounts_update"
  ON bank_accounts FOR UPDATE TO authenticated
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

CREATE POLICY "bank_accounts_delete"
  ON bank_accounts FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );
