-- ============================================================
-- 22: Fix reimbursement SELECT policies
--
-- Root cause: "reimb: own or finance" and "reimb_items: read"
-- used is_platform_admin() + my_org_role() SECURITY DEFINER
-- functions which are broken in PostgREST — causing SELECT to
-- return empty results even though records exist in the DB.
-- Replace with inline auth.uid() subqueries.
-- ============================================================

DROP POLICY IF EXISTS "reimb: own or finance" ON reimbursement_requests;

CREATE POLICY "reimb_requests_select"
  ON reimbursement_requests FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

DROP POLICY IF EXISTS "reimb_items: read" ON reimbursement_items;

CREATE POLICY "reimb_items_select"
  ON reimbursement_items FOR SELECT TO authenticated
  USING (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );
