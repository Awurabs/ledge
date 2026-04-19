-- ============================================================
-- 21: Fix reimbursement_requests INSERT policy
--
-- Root cause: "reimb: insert" used is_org_member() SECURITY
-- DEFINER function which silently blocks inserts in PostgREST.
-- Replace with inline auth.uid() subquery (same pattern used
-- for invoices, contacts, bills).
-- ============================================================

DROP POLICY IF EXISTS "reimb: insert" ON reimbursement_requests;

CREATE POLICY "reimb_requests_insert"
  ON reimbursement_requests FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );
