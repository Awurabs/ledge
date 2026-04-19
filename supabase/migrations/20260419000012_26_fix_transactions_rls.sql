-- Fix transactions RLS (broken SECURITY DEFINER → inline subqueries)
DROP POLICY IF EXISTS "txns: finance write" ON transactions;
DROP POLICY IF EXISTS "txns: member read"   ON transactions;

CREATE POLICY "transactions_select"
  ON transactions FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "transactions_insert"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "transactions_update"
  ON transactions FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "transactions_delete"
  ON transactions FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));
