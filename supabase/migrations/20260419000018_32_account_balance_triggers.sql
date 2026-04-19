-- ============================================================
-- 32: Account balance triggers
--
-- 1. sync_posted_entry_to_balances()
--    AFTER UPDATE on journal_entries — updates current_balance
--    on every affected chart_of_accounts row when a journal
--    entry transitions draft→posted or posted→reversed.
--
-- 2. recalculate_all_account_balances()
--    Callable function that wipes and recomputes every
--    account's current_balance from scratch using all posted
--    journal_entry_lines. Safe to call any time balances drift.
-- ============================================================

-- ── 1. Live sync trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.sync_posted_entry_to_balances()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- draft → posted: add the net effect of each line to the account balance
  IF OLD.status IS DISTINCT FROM 'posted'::journal_status
     AND NEW.status = 'posted'::journal_status
  THEN
    UPDATE chart_of_accounts ca
    SET current_balance = current_balance + (
      CASE
        WHEN ca.type IN ('asset'::account_type, 'expense'::account_type)
          THEN jel.debit_amount - jel.credit_amount   -- debit-normal
        ELSE
          jel.credit_amount - jel.debit_amount         -- credit-normal
      END
    )
    FROM journal_entry_lines jel
    WHERE jel.journal_id = NEW.id
      AND ca.id = jel.account_id;
  END IF;

  -- posted → reversed: undo the net effect of each line
  IF OLD.status = 'posted'::journal_status
     AND NEW.status = 'reversed'::journal_status
  THEN
    UPDATE chart_of_accounts ca
    SET current_balance = current_balance - (
      CASE
        WHEN ca.type IN ('asset'::account_type, 'expense'::account_type)
          THEN jel.debit_amount - jel.credit_amount
        ELSE
          jel.credit_amount - jel.debit_amount
      END
    )
    FROM journal_entry_lines jel
    WHERE jel.journal_id = NEW.id
      AND ca.id = jel.account_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_posted_entry_balances ON journal_entries;
CREATE TRIGGER trg_sync_posted_entry_balances
  AFTER UPDATE OF status ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.sync_posted_entry_to_balances();

-- ── 2. Full recompute function ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recalculate_all_account_balances(
  p_organization_id uuid DEFAULT NULL
)
RETURNS TABLE (account_id uuid, account_code text, old_balance bigint, new_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Recompute: sum all posted journal entry lines per account
  RETURN QUERY
  WITH computed AS (
    SELECT
      ca.id                                          AS acc_id,
      ca.code                                        AS acc_code,
      ca.current_balance                             AS old_bal,
      COALESCE(
        SUM(
          CASE
            WHEN ca.type IN ('asset', 'expense')
              THEN jel.debit_amount - jel.credit_amount
            ELSE
              jel.credit_amount - jel.debit_amount
          END
        ), 0
      )                                              AS new_bal
    FROM chart_of_accounts ca
    LEFT JOIN journal_entry_lines jel ON jel.account_id = ca.id
    LEFT JOIN journal_entries     je  ON je.id = jel.journal_id
                                      AND je.status = 'posted'
                                      AND (p_organization_id IS NULL
                                           OR je.organization_id = p_organization_id)
    WHERE (p_organization_id IS NULL OR ca.organization_id = p_organization_id)
    GROUP BY ca.id, ca.code, ca.current_balance
  ),
  updated AS (
    UPDATE chart_of_accounts
    SET current_balance = c.new_bal
    FROM computed c
    WHERE chart_of_accounts.id = c.acc_id
      AND chart_of_accounts.current_balance IS DISTINCT FROM c.new_bal
    RETURNING chart_of_accounts.id
  )
  SELECT c.acc_id, c.acc_code, c.old_bal, c.new_bal
  FROM computed c
  ORDER BY c.acc_code;
END;
$$;

-- Grant execution to authenticated users (Supabase RLS still applies to tables)
GRANT EXECUTE ON FUNCTION public.recalculate_all_account_balances(uuid) TO authenticated;
