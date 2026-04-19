-- ============================================================
-- 28: Add payer / payment columns to revenue_records
-- The original migration (09) created revenue_records without
-- payer_name, client_id, payment_method, ref_number, or note.
-- The app code expects all five — this migration adds them.
-- ============================================================

ALTER TABLE revenue_records
  -- Who paid (plain text, required)
  ADD COLUMN IF NOT EXISTS payer_name     text NOT NULL DEFAULT '',
  -- Optional FK to a contact (customer)
  ADD COLUMN IF NOT EXISTS client_id      uuid REFERENCES contacts(id),
  -- How it was paid
  ADD COLUMN IF NOT EXISTS payment_method payment_method,
  -- App-generated reference  e.g. "REV-1713456789012"
  ADD COLUMN IF NOT EXISTS ref_number     text,
  -- Free-form note / memo
  ADD COLUMN IF NOT EXISTS note           text;

-- Index for searching by payer
CREATE INDEX IF NOT EXISTS revenue_records_payer_name_idx
  ON revenue_records (organization_id, payer_name);

-- Index for client lookups
CREATE INDEX IF NOT EXISTS revenue_records_client_id_idx
  ON revenue_records (client_id);
