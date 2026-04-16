-- ============================================================
-- Immutable date wrapper (needed for partial indexes on date cols)
-- date_trunc is STABLE, not IMMUTABLE — this wrapper is IMMUTABLE
-- ============================================================
create or replace function public.date_month(d date)
returns date language sql immutable as $$
  select (date_trunc('month', d::timestamptz) at time zone 'UTC')::date;
$$;

-- ============================================================
-- Additional composite / partial indexes
-- ============================================================
create index txns_month_category
  on transactions (organization_id, public.date_month(txn_date), category_id)
  where deleted_at is null;

create index invoices_month
  on invoices (organization_id, public.date_month(issue_date))
  where deleted_at is null;

create index expenses_month
  on expenses (organization_id, public.date_month(expense_date))
  where deleted_at is null;

create index revenue_month
  on revenue_records (organization_id, public.date_month(revenue_date))
  where deleted_at is null;

-- ============================================================
-- Auto-create profile on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Journal entry double-entry balance validation
-- Fires BEFORE UPDATE to prevent posting an unbalanced entry
-- ============================================================
create or replace function public.validate_journal_balance()
returns trigger language plpgsql as $$
declare
  v_debit  bigint;
  v_credit bigint;
begin
  if new.status = 'posted' and old.status <> 'posted' then
    select
      coalesce(sum(debit_amount),  0),
      coalesce(sum(credit_amount), 0)
    into v_debit, v_credit
    from journal_entry_lines
    where journal_entry_id = new.id;

    if v_debit <> v_credit then
      raise exception
        'Journal entry % is unbalanced: debits=% credits=%',
        new.entry_number, v_debit, v_credit;
    end if;

    new.total_debit  := v_debit;
    new.total_credit := v_credit;
    new.posted_at    := now();
  end if;
  return new;
end;
$$;

create trigger validate_journal_balance_trigger
  before update on journal_entries
  for each row execute function public.validate_journal_balance();

-- ============================================================
-- Seed: SaaS plans
-- ============================================================
insert into saas_plans (
  name, tier,
  price_monthly_usd_cents, price_annually_usd_cents,
  max_members, max_transactions_pm, max_cards,
  has_ai_copilot, has_api_access, has_custom_roles
) values
  ('Free',       'free',       0,      0,      3,    100,  1,    false, false, false),
  ('Starter',    'starter',    2900,   29000,  10,   1000, 5,    false, false, false),
  ('Growth',     'growth',     7900,   79000,  25,   5000, 20,   true,  true,  false),
  ('Enterprise', 'enterprise', 29900,  299000, null, null, null, true,  true,  true);

-- ============================================================
-- Seed: System transaction categories (org-agnostic)
-- ============================================================
insert into transaction_categories (name, emoji, type, is_system, sort_order) values
  ('Sales Revenue',    '💰', 'revenue', true,  1),
  ('Service Income',   '🤝', 'revenue', true,  2),
  ('Consulting Fees',  '💼', 'revenue', true,  3),
  ('Grants & Awards',  '🏆', 'revenue', true,  4),
  ('Interest Income',  '🏦', 'revenue', true,  5),
  ('Rental Income',    '🏠', 'revenue', true,  6),
  ('Other Revenue',    '📥', 'revenue', true,  7),
  ('Salaries',         '👥', 'expense', true, 10),
  ('Rent & Office',    '🏢', 'expense', true, 11),
  ('Software & Tools', '💻', 'expense', true, 12),
  ('Marketing',        '📣', 'expense', true, 13),
  ('Travel',           '✈️', 'expense', true, 14),
  ('Utilities',        '💡', 'expense', true, 15),
  ('Insurance',        '🛡️', 'expense', true, 16),
  ('Other Expense',    '📤', 'expense', true, 17);
