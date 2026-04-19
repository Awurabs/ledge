-- Fix revenue_records RLS (broken SECURITY DEFINER → inline subqueries)
DROP POLICY IF EXISTS "revenue: read"  ON revenue_records;
DROP POLICY IF EXISTS "revenue: write" ON revenue_records;

CREATE POLICY "revenue_select"
  ON revenue_records FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "revenue_insert"
  ON revenue_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "revenue_update"
  ON revenue_records FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "revenue_delete"
  ON revenue_records FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));
