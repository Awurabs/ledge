-- ============================================================
-- 13: Create contacts table + fix invoicing schema mismatches
-- Applied to close the gap between the original applied migration
-- (which created invoices/bills with old column names) and the
-- hook code which expects the current column names.
-- ============================================================

-- 1. Create contacts table (customers & vendors)
CREATE TABLE IF NOT EXISTS contacts (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  address         text,
  tax_id          text,
  type            text NOT NULL DEFAULT 'both',
  currency        currency_code NOT NULL DEFAULT 'GHS',
  payment_terms   text DEFAULT 'Net 30',
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS contacts_organization_id_idx ON contacts (organization_id);

CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. RLS for contacts (see migration 14 for final policies)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 3. Add missing columns to invoices
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS contact_id      uuid REFERENCES contacts(id),
  ADD COLUMN IF NOT EXISTS issue_date      date,
  ADD COLUMN IF NOT EXISTS amount_paid     bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_due      bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS footer          text;

CREATE INDEX IF NOT EXISTS invoices_contact_id_idx ON invoices (contact_id);

-- 4. Add missing columns to invoice_line_items
ALTER TABLE invoice_line_items
  ADD COLUMN IF NOT EXISTS line_total  bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate    numeric(5,2) NOT NULL DEFAULT 0;

-- 5. Add created_by to invoice_payments
ALTER TABLE invoice_payments
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES profiles(id);

-- 6. Add description to revenue_records
ALTER TABLE revenue_records
  ADD COLUMN IF NOT EXISTS description text;
