-- ============================================================
-- 17: Fix invoice totals via trigger + backfill + fix RLS
--
-- Root cause: total_amount and subtotal were storing as 0 due
-- to the FOR ALL USING RLS pattern silently blocking the field
-- writes on INSERT. Fixed by:
-- 1. Adding a trigger on invoice_line_items that recomputes
--    subtotal/tax_amount/total_amount/amount_due on the parent
--    invoice after any line item change.
-- 2. Backfilling existing invoices that have total_amount=0
--    but have line items with correct line_total values.
-- 3. Replacing FOR ALL USING RLS policies on invoices and
--    invoice_line_items with explicit per-command policies
--    using proper WITH CHECK for INSERT/UPDATE.
-- ============================================================

-- 1. Trigger: recompute invoice totals after line items change
CREATE OR REPLACE FUNCTION sync_invoice_totals()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invoice_id  uuid;
  v_subtotal    bigint;
  v_tax_rate    numeric;
  v_discount    bigint;
  v_tax_amount  bigint;
  v_total       bigint;
  v_paid        bigint;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(line_total), 0)
  INTO v_subtotal
  FROM invoice_line_items
  WHERE invoice_id = v_invoice_id;

  SELECT
    COALESCE(tax_rate, 0),
    COALESCE(discount_amount, 0),
    COALESCE(amount_paid, 0)
  INTO v_tax_rate, v_discount, v_paid
  FROM invoices
  WHERE id = v_invoice_id;

  v_tax_amount := ROUND(v_subtotal * v_tax_rate / 100);
  v_total      := v_subtotal + v_tax_amount - v_discount;

  UPDATE invoices
  SET
    subtotal     = v_subtotal,
    tax_amount   = v_tax_amount,
    total_amount = v_total,
    amount_due   = GREATEST(0, v_total - v_paid)
  WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_totals ON invoice_line_items;
CREATE TRIGGER trg_sync_invoice_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_totals();

-- 2. Backfill existing invoices with total_amount = 0
UPDATE invoices i
SET
  subtotal     = li.subtotal,
  tax_amount   = ROUND(li.subtotal * COALESCE(i.tax_rate, 0) / 100),
  total_amount = li.subtotal + ROUND(li.subtotal * COALESCE(i.tax_rate, 0) / 100)
                 - COALESCE(i.discount_amount, 0),
  amount_due   = GREATEST(
                   0,
                   li.subtotal + ROUND(li.subtotal * COALESCE(i.tax_rate, 0) / 100)
                   - COALESCE(i.discount_amount, 0)
                   - COALESCE(i.amount_paid, 0)
                 )
FROM (
  SELECT invoice_id, SUM(line_total) AS subtotal
  FROM invoice_line_items
  GROUP BY invoice_id
) li
WHERE i.id = li.invoice_id
  AND i.total_amount = 0
  AND li.subtotal > 0;

-- 3. Fix invoices RLS policies
DROP POLICY IF EXISTS "org_member_select_inv" ON invoices;
DROP POLICY IF EXISTS "finance_manage_inv"    ON invoices;

CREATE POLICY "invoices_select"
  ON invoices FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "invoices_insert"
  ON invoices FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  );

CREATE POLICY "invoices_update"
  ON invoices FOR UPDATE TO authenticated
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

CREATE POLICY "invoices_delete"
  ON invoices FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND deactivated_at IS NULL
        AND role IN ('owner', 'admin', 'finance_lead', 'accountant')
    )
  );

-- 4. Fix invoice_line_items RLS policies
DROP POLICY IF EXISTS "via_invoice_select_lines" ON invoice_line_items;

CREATE POLICY "line_items_select"
  ON invoice_line_items FOR SELECT TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );

CREATE POLICY "line_items_insert"
  ON invoice_line_items FOR INSERT TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );

CREATE POLICY "line_items_update"
  ON invoice_line_items FOR UPDATE TO authenticated
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND deactivated_at IS NULL
      )
    )
  );
