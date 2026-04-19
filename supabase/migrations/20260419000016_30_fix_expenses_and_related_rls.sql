-- ============================================================
-- 30: Fix expenses + commonly-used tables RLS
-- All old policies use broken SECURITY DEFINER functions.
-- Replace with inline auth.uid() subqueries.
-- ============================================================

-- ── expenses ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expenses: employee insert" ON expenses;
DROP POLICY IF EXISTS "expenses: own or finance"  ON expenses;
DROP POLICY IF EXISTS "expenses: finance update"  ON expenses;

CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
    AND member_id IN (
      SELECT id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

-- ── expense_attachments ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "expense_att: write"      ON expense_attachments;
DROP POLICY IF EXISTS "expense_att: org member" ON expense_attachments;

CREATE POLICY "expense_attachments_select" ON expense_attachments FOR SELECT TO authenticated
  USING (expense_id IN (
    SELECT id FROM expenses WHERE organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  ));

CREATE POLICY "expense_attachments_insert" ON expense_attachments FOR INSERT TO authenticated
  WITH CHECK (expense_id IN (
    SELECT id FROM expenses WHERE organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  ));

CREATE POLICY "expense_attachments_delete" ON expense_attachments FOR DELETE TO authenticated
  USING (expense_id IN (
    SELECT id FROM expenses WHERE organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  ));

-- ── transaction_categories ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tx_cat: finance write" ON transaction_categories;
DROP POLICY IF EXISTS "tx_cat: read"          ON transaction_categories;

CREATE POLICY "transaction_categories_select" ON transaction_categories FOR SELECT TO authenticated
  USING (
    organization_id IS NULL
    OR organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "transaction_categories_insert" ON transaction_categories FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "transaction_categories_update" ON transaction_categories FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

-- ── departments ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dept: admin write" ON departments;
DROP POLICY IF EXISTS "dept: member read" ON departments;

CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));
