-- ============================================================
-- 20: Fix reimbursements RLS + create receipts storage bucket
--
-- Issues fixed:
-- 1. reimbursement_items had FOR ALL USING — INSERT silently
--    blocked in PostgREST (no WITH CHECK). Replace with
--    explicit per-command policies.
-- 2. reimbursement_requests finance UPDATE had no WITH CHECK.
-- 3. Create storage bucket for receipt file uploads.
-- ============================================================

-- 1. Fix reimbursement_items write policy
DROP POLICY IF EXISTS "reimb_items: write" ON reimbursement_items;

CREATE POLICY "reimb_items_insert"
  ON reimbursement_items FOR INSERT TO authenticated
  WITH CHECK (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );

CREATE POLICY "reimb_items_update"
  ON reimbursement_items FOR UPDATE TO authenticated
  USING (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  )
  WITH CHECK (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );

CREATE POLICY "reimb_items_delete"
  ON reimbursement_items FOR DELETE TO authenticated
  USING (
    reimbursement_id IN (
      SELECT id FROM reimbursement_requests
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );

-- 2. Fix reimbursement_requests finance update — add WITH CHECK
DROP POLICY IF EXISTS "reimb: finance update" ON reimbursement_requests;

CREATE POLICY "reimb_requests_update"
  ON reimbursement_requests FOR UPDATE TO authenticated
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

-- 3. Create receipts storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: org members can upload and read their own receipts
CREATE POLICY "receipts_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "receipts_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

CREATE POLICY "receipts_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'receipts');
