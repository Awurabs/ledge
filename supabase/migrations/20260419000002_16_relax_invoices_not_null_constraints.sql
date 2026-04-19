-- ============================================================
-- 16: Relax NOT NULL constraints on invoices columns that were
-- required by the old denormalised schema but are no longer
-- needed now that contact_id (FK → contacts) is used instead.
-- ============================================================

-- client_name was the old denormalised contact name; new schema uses contact_id
ALTER TABLE invoices
  ALTER COLUMN client_name DROP NOT NULL,
  ALTER COLUMN client_name SET DEFAULT '';

-- created_by should be nullable in case user context is unavailable
ALTER TABLE invoices
  ALTER COLUMN created_by DROP NOT NULL;
