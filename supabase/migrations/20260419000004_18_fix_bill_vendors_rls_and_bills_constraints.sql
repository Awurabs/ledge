-- ============================================================
-- 18: Fix bill_vendors RLS (no policies existed) + fix bills
--     RLS (FOR ALL → per-command) + relax NOT NULL constraints
--
-- Root causes:
--   1. bill_vendors had RLS enabled but NO policies at all →
--      every SELECT returned 0 rows, every INSERT failed silently
--   2. bills used FOR ALL USING which doesn't cover INSERT WITH
--      CHECK in PostgREST, causing silent write failures
--   3. bills.vendor_name NOT NULL caused insert failures when
--      not supplied (it's a snapshot field, can be derived)
--   4. bills.bill_number NOT NULL forced callers to supply a
--      number; making it nullable lets users omit it
-- ============================================================

-- 1. Add RLS policies for bill_vendors (none existed)
CREATE POLICY "bill_vendors_select"
  ON bill_vendors FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "bill_vendors_insert"
  ON bill_vendors FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "bill_vendors_update"
  ON bill_vendors FOR UPDATE TO authenticated
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

CREATE POLICY "bill_vendors_delete"
  ON bill_vendors FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

-- 2. Fix bills RLS — replace FOR ALL USING with explicit per-command policies
DROP POLICY IF EXISTS "org_member_select_bills" ON bills;
DROP POLICY IF EXISTS "finance_manage_bills"    ON bills;

CREATE POLICY "bills_select"
  ON bills FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "bills_insert"
  ON bills FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "bills_update"
  ON bills FOR UPDATE TO authenticated
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

CREATE POLICY "bills_delete"
  ON bills FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

-- 3. Relax NOT NULL constraints that block inserts
--    vendor_name: snapshot field, will be populated from vendor join
ALTER TABLE bills
  ALTER COLUMN vendor_name DROP NOT NULL,
  ALTER COLUMN vendor_name SET DEFAULT '';

--    bill_number: user-provided reference; make nullable so it can be omitted
ALTER TABLE bills
  ALTER COLUMN bill_number DROP NOT NULL;
