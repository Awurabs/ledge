-- Drop the old FK that pointed at the legacy 'clients' table
-- and replace it with one that points at 'contacts'
ALTER TABLE revenue_records
  DROP CONSTRAINT IF EXISTS revenue_records_client_id_fkey;

ALTER TABLE revenue_records
  ADD CONSTRAINT revenue_records_client_id_fkey
  FOREIGN KEY (client_id) REFERENCES contacts(id)
  ON DELETE SET NULL;
