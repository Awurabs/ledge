-- ============================================================
-- 31: Approval pipeline — schema alignment + DB triggers
--
-- The original approval_requests table schema predates the UI.
-- This migration:
--   1. Adds missing columns to approval_requests
--   2. Creates approval_comments table + RLS
--   3. Replaces broken RLS policies on approval_requests
--   4. Forward trigger: expenses   → approval_requests on submit
--   5. Forward trigger: reimbursement_requests → approval_requests on submit
--   6. Forward trigger: bills      → approval_requests on pending
--   7. Reverse trigger: approval decision → updates source record status
--   8. Close trigger:  direct actions on source → closes pending approval
-- ============================================================

-- ── 1. Extend approval_requests ───────────────────────────────────────────────
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS requestor_id  uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS assignee_id   uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS decided_by    uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS request_type  text,
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS amount        bigint,
  ADD COLUMN IF NOT EXISTS currency      currency_code NOT NULL DEFAULT 'GHS',
  ADD COLUMN IF NOT EXISTS decision_note text;

-- Back-fill request_type from entity_type for any existing rows
UPDATE approval_requests SET request_type = entity_type WHERE request_type IS NULL;

-- ── 2. approval_comments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_comments (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  approval_id uuid        NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES profiles(id),
  body        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS approval_comments_approval_id_idx
  ON approval_comments (approval_id);
ALTER TABLE approval_comments ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS — replace broken policies with inline subqueries ───────────────────

-- approval_requests: SELECT
DROP POLICY IF EXISTS "org_member_select_approval" ON approval_requests;
CREATE POLICY "approval_requests_select" ON approval_requests FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

-- approval_requests: INSERT (trigger functions are SECURITY DEFINER, so this
-- covers manual inserts if needed)
DROP POLICY IF EXISTS "system_insert_approval" ON approval_requests;
CREATE POLICY "approval_requests_insert" ON approval_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

-- approval_requests: UPDATE (finance roles only)
DROP POLICY IF EXISTS "approver_decide" ON approval_requests;
CREATE POLICY "approval_requests_update" ON approval_requests FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
      AND deactivated_at IS NULL
      AND role IN ('owner', 'admin', 'finance_lead')
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
      AND deactivated_at IS NULL
      AND role IN ('owner', 'admin', 'finance_lead')
  ));

-- approval_comments: SELECT
CREATE POLICY "approval_comments_select" ON approval_comments FOR SELECT TO authenticated
  USING (approval_id IN (
    SELECT id FROM approval_requests
    WHERE organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  ));

-- approval_comments: INSERT
CREATE POLICY "approval_comments_insert" ON approval_comments FOR INSERT TO authenticated
  WITH CHECK (approval_id IN (
    SELECT id FROM approval_requests
    WHERE organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND deactivated_at IS NULL
    )
  ));

-- ── 4. Forward trigger: expenses ──────────────────────────────────────────────
-- Fires when an expense is created with status='submitted', or updated to it.
-- SECURITY DEFINER so the insert bypasses RLS regardless of the caller's role.

CREATE OR REPLACE FUNCTION public.create_approval_on_expense_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_requestor_id uuid;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted')
  OR (TG_OP = 'UPDATE'
      AND (OLD.status IS DISTINCT FROM 'submitted')
      AND NEW.status = 'submitted')
  THEN
    -- Resolve organization_member → profile (auth user id)
    SELECT user_id INTO v_requestor_id
    FROM organization_members
    WHERE id = NEW.member_id;

    -- Idempotency guard: one open request per expense
    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'expense'
        AND entity_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, entity_type, entity_id,
        request_type, requestor_id,
        description, amount, currency, decision
      ) VALUES (
        NEW.organization_id, 'expense', NEW.id,
        'expense', v_requestor_id,
        COALESCE(NEW.merchant_name, 'Expense'),
        COALESCE(NEW.amount, 0),
        COALESCE(NEW.currency, 'GHS'::currency_code),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_submit ON expenses;
CREATE TRIGGER trg_expense_submit
  AFTER INSERT OR UPDATE OF status ON expenses
  FOR EACH ROW EXECUTE FUNCTION public.create_approval_on_expense_submit();

-- ── 5. Forward trigger: reimbursement_requests ────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_approval_on_reimb_submit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_requestor_id uuid;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted')
  OR (TG_OP = 'UPDATE'
      AND (OLD.status IS DISTINCT FROM 'submitted')
      AND NEW.status = 'submitted')
  THEN
    SELECT user_id INTO v_requestor_id
    FROM organization_members
    WHERE id = NEW.member_id;

    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'reimbursement'
        AND entity_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, entity_type, entity_id,
        request_type, requestor_id,
        description, amount, decision
      ) VALUES (
        NEW.organization_id, 'reimbursement', NEW.id,
        'reimbursement', v_requestor_id,
        COALESCE(NEW.title, 'Reimbursement request'),
        COALESCE(NEW.total_amount, 0),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reimb_submit ON reimbursement_requests;
CREATE TRIGGER trg_reimb_submit
  AFTER INSERT OR UPDATE OF status ON reimbursement_requests
  FOR EACH ROW EXECUTE FUNCTION public.create_approval_on_reimb_submit();

-- ── 6. Forward trigger: bills ─────────────────────────────────────────────────
-- Bills go for approval when status transitions to 'pending'.
-- bills.created_by is already a profiles FK, so used directly as requestor.

CREATE OR REPLACE FUNCTION public.create_approval_on_bill_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
  OR (TG_OP = 'UPDATE'
      AND (OLD.status IS DISTINCT FROM 'pending')
      AND NEW.status = 'pending')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'bill'
        AND entity_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, entity_type, entity_id,
        request_type, requestor_id,
        description, amount, currency, decision
      ) VALUES (
        NEW.organization_id, 'bill', NEW.id,
        'bill', NEW.created_by,
        COALESCE(NEW.bill_number, 'Bill for approval'),
        COALESCE(NEW.amount, NEW.total_amount, 0),
        COALESCE(NEW.currency, 'GHS'::currency_code),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bill_pending ON bills;
CREATE TRIGGER trg_bill_pending
  AFTER INSERT OR UPDATE OF status ON bills
  FOR EACH ROW EXECUTE FUNCTION public.create_approval_on_bill_pending();

-- ── 7. Reverse trigger: approval decision → source record status ───────────────
-- When a finance manager approves/rejects in the Approvals UI, this syncs the
-- status back to the originating expense/reimbursement/bill row.
-- pg_trigger_depth() guard prevents infinite loops with the close trigger below.

CREATE OR REPLACE FUNCTION public.sync_approval_decision_to_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_type text;
BEGIN
  -- Prevent recursion when called from close_approval_on_direct_action
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  -- Only act when decision moves from pending to a final state
  IF OLD.decision = 'pending' AND NEW.decision IN ('approved', 'rejected') THEN
    v_type := COALESCE(NEW.request_type, NEW.entity_type);

    IF v_type = 'expense' THEN
      IF NEW.decision = 'approved' THEN
        UPDATE expenses
        SET status = 'approved', approved_at = now()
        WHERE id = NEW.entity_id;
      ELSE
        UPDATE expenses
        SET status = 'rejected', rejected_at = now()
        WHERE id = NEW.entity_id;
      END IF;

    ELSIF v_type = 'reimbursement' THEN
      IF NEW.decision = 'approved' THEN
        UPDATE reimbursement_requests
        SET status = 'approved',
            approved_at = now(),
            approved_by = NEW.decided_by
        WHERE id = NEW.entity_id;
      ELSE
        UPDATE reimbursement_requests
        SET status = 'rejected',
            rejected_at = now(),
            rejected_by = NEW.decided_by
        WHERE id = NEW.entity_id;
      END IF;

    ELSIF v_type = 'bill' THEN
      IF NEW.decision = 'approved' THEN
        -- Bills move to 'scheduled' (queued for payment) when approved
        UPDATE bills
        SET status      = 'scheduled',
            approved_at = now(),
            approved_by = NEW.decided_by
        WHERE id = NEW.entity_id;
      END IF;
      -- No rejection state in bill_status enum; leave bill unchanged on reject
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_decision ON approval_requests;
CREATE TRIGGER trg_approval_decision
  AFTER UPDATE OF decision ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_approval_decision_to_source();

-- ── 8. Close trigger: direct actions on source → close pending approval ────────
-- When a manager approves/rejects directly from the Expenses or Bills page
-- (bypassing the Approvals UI), this closes the corresponding approval_request
-- so the queue stays clean.
-- pg_trigger_depth() guard prevents re-entrancy with the reverse trigger above.

CREATE OR REPLACE FUNCTION public.close_approval_on_direct_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Prevent recursion when called from sync_approval_decision_to_source
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'expenses'
     AND NEW.status IN ('approved', 'rejected')
     AND OLD.status = 'submitted'
  THEN
    UPDATE approval_requests
    SET decision   = NEW.status::approval_decision,
        decided_at = now()
    WHERE request_type = 'expense'
      AND entity_id = NEW.id
      AND decision = 'pending';

  ELSIF TG_TABLE_NAME = 'reimbursement_requests'
     AND NEW.status IN ('approved', 'rejected')
     AND OLD.status = 'submitted'
  THEN
    UPDATE approval_requests
    SET decision   = NEW.status::approval_decision,
        decided_at = now()
    WHERE request_type = 'reimbursement'
      AND entity_id = NEW.id
      AND decision = 'pending';

  ELSIF TG_TABLE_NAME = 'bills'
     AND NEW.status IN ('scheduled', 'paid', 'void')
  THEN
    UPDATE approval_requests
    SET decision   = CASE
                       WHEN NEW.status = 'void' THEN 'rejected'::approval_decision
                       ELSE 'approved'::approval_decision
                     END,
        decided_at = now()
    WHERE request_type = 'bill'
      AND entity_id = NEW.id
      AND decision = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expense_direct_action ON expenses;
CREATE TRIGGER trg_expense_direct_action
  AFTER UPDATE OF status ON expenses
  FOR EACH ROW EXECUTE FUNCTION public.close_approval_on_direct_action();

DROP TRIGGER IF EXISTS trg_reimb_direct_action ON reimbursement_requests;
CREATE TRIGGER trg_reimb_direct_action
  AFTER UPDATE OF status ON reimbursement_requests
  FOR EACH ROW EXECUTE FUNCTION public.close_approval_on_direct_action();

DROP TRIGGER IF EXISTS trg_bill_direct_action ON bills;
CREATE TRIGGER trg_bill_direct_action
  AFTER UPDATE OF status ON bills
  FOR EACH ROW EXECUTE FUNCTION public.close_approval_on_direct_action();
