-- ============================================================
-- 31: Approval pipeline — approval_comments + DB triggers
--
-- The production approval_requests table already has all needed
-- columns (request_type, reference_id, requestor_id, assignee_id,
-- decided_by, decision_note, amount, currency, description).
-- This migration adds what's still missing:
--   1. approval_comments table + RLS
--   2. Replace broken RLS policies on approval_requests
--   3. Forward trigger: expenses   → approval_requests on submit
--   4. Forward trigger: reimbursement_requests → approval_requests on submit
--   5. Forward trigger: bills      → approval_requests when status='pending'
--   6. Reverse trigger: approval decision → updates source record status
--   7. Close trigger:  direct actions on source → closes pending approval
-- ============================================================

-- ── 1. approval_comments ──────────────────────────────────────────────────────
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

-- ── 2. RLS — replace broken SECURITY DEFINER policies ─────────────────────────

-- approval_requests: SELECT
DROP POLICY IF EXISTS "org_member_select_approval" ON approval_requests;
CREATE POLICY "approval_requests_select" ON approval_requests FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid() AND deactivated_at IS NULL
  ));

-- approval_requests: INSERT
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

-- ── 3. Forward trigger: expenses ──────────────────────────────────────────────
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

    -- Need a requestor_id (NOT NULL on approval_requests)
    IF v_requestor_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Idempotency: skip if an open approval already exists for this expense
    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'expense'
        AND reference_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, request_type, reference_id,
        requestor_id, description, amount, currency, decision
      ) VALUES (
        NEW.organization_id, 'expense', NEW.id,
        v_requestor_id,
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

-- ── 4. Forward trigger: reimbursement_requests ────────────────────────────────
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

    IF v_requestor_id IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'reimbursement'
        AND reference_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, request_type, reference_id,
        requestor_id, description, amount, currency, decision
      ) VALUES (
        NEW.organization_id, 'reimbursement', NEW.id,
        v_requestor_id,
        COALESCE(NEW.title, 'Reimbursement request'),
        COALESCE(NEW.total_amount, 0),
        COALESCE(NEW.currency, 'GHS'::currency_code),
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

-- ── 5. Forward trigger: bills ─────────────────────────────────────────────────
-- bills.created_by is already a profiles FK — used directly as requestor_id.
CREATE OR REPLACE FUNCTION public.create_approval_on_bill_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
  OR (TG_OP = 'UPDATE'
      AND (OLD.status IS DISTINCT FROM 'pending')
      AND NEW.status = 'pending')
  THEN
    IF NEW.created_by IS NULL THEN
      RETURN NEW;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM approval_requests
      WHERE request_type = 'bill'
        AND reference_id = NEW.id
        AND decision = 'pending'
    ) THEN
      INSERT INTO approval_requests (
        organization_id, request_type, reference_id,
        requestor_id, description, amount, currency, decision
      ) VALUES (
        NEW.organization_id, 'bill', NEW.id,
        NEW.created_by,
        COALESCE(NEW.bill_number, 'Bill for approval'),
        COALESCE(NEW.amount, 0),
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

-- ── 6. Reverse trigger: approval decision → source record status ───────────────
CREATE OR REPLACE FUNCTION public.sync_approval_decision_to_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Guard against recursion from the close trigger below
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  IF OLD.decision = 'pending' AND NEW.decision IN ('approved', 'rejected') THEN

    IF NEW.request_type = 'expense' THEN
      IF NEW.decision = 'approved' THEN
        UPDATE expenses
        SET status = 'approved', approved_at = now(), approved_by = NEW.decided_by
        WHERE id = NEW.reference_id;
      ELSE
        UPDATE expenses
        SET status = 'rejected', rejected_at = now(), rejected_by = NEW.decided_by
        WHERE id = NEW.reference_id;
      END IF;

    ELSIF NEW.request_type = 'reimbursement' THEN
      IF NEW.decision = 'approved' THEN
        UPDATE reimbursement_requests
        SET status = 'approved', approved_at = now(), approved_by = NEW.decided_by
        WHERE id = NEW.reference_id;
      ELSE
        UPDATE reimbursement_requests
        SET status = 'rejected', rejected_at = now(), rejected_by = NEW.decided_by
        WHERE id = NEW.reference_id;
      END IF;

    ELSIF NEW.request_type = 'bill' THEN
      IF NEW.decision = 'approved' THEN
        -- Bills move to 'scheduled' (queued for payment) when approved
        UPDATE bills
        SET status = 'scheduled', approved_at = now(), approved_by = NEW.decided_by
        WHERE id = NEW.reference_id;
      END IF;
      -- bill_status has no rejected state; leave bill unchanged on reject
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_decision ON approval_requests;
CREATE TRIGGER trg_approval_decision
  AFTER UPDATE OF decision ON approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_approval_decision_to_source();

-- ── 7. Close trigger: direct approval on source → close pending approval ───────
-- Keeps the approval queue clean when managers act directly from Expenses/Bills.
CREATE OR REPLACE FUNCTION public.close_approval_on_direct_action()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Guard against recursion from sync_approval_decision_to_source
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  IF TG_TABLE_NAME = 'expenses'
     AND NEW.status IN ('approved', 'rejected')
     AND OLD.status = 'submitted'
  THEN
    UPDATE approval_requests
    SET decision = NEW.status::approval_decision, decided_at = now()
    WHERE request_type = 'expense'
      AND reference_id = NEW.id
      AND decision = 'pending';

  ELSIF TG_TABLE_NAME = 'reimbursement_requests'
     AND NEW.status IN ('approved', 'rejected')
     AND OLD.status = 'submitted'
  THEN
    UPDATE approval_requests
    SET decision = NEW.status::approval_decision, decided_at = now()
    WHERE request_type = 'reimbursement'
      AND reference_id = NEW.id
      AND decision = 'pending';

  ELSIF TG_TABLE_NAME = 'bills'
     AND NEW.status IN ('scheduled', 'paid', 'void')
  THEN
    UPDATE approval_requests
    SET decision = CASE
                     WHEN NEW.status = 'void' THEN 'rejected'::approval_decision
                     ELSE 'approved'::approval_decision
                   END,
        decided_at = now()
    WHERE request_type = 'bill'
      AND reference_id = NEW.id
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
