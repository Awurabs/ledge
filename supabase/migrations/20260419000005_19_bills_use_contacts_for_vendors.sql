-- ============================================================
-- 19: Point bills at contacts table for vendor references
--
-- Root cause: Customers & Vendors page saves vendors to the
-- contacts table (type='vendor'). Bills page was looking in
-- bill_vendors — a completely separate, always-empty table.
--
-- Fix: add contact_id FK on bills referencing contacts(id).
-- The application now queries contacts (type=vendor|both) for
-- the vendor dropdown and stores contact_id on each bill.
-- ============================================================

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id);

CREATE INDEX IF NOT EXISTS bills_contact_id_idx ON bills (contact_id);
