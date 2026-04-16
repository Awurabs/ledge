-- =============================================================================
-- BTV LEDGE — SUPABASE DATABASE SCHEMA
-- Platform: Multi-tenant SaaS (fintech, Africa-first)
-- DB: PostgreSQL 15 via Supabase
-- Auth: Supabase Auth (auth.users)
-- Security: Row Level Security (RLS) on every table
-- Currency: amounts stored as integer minor units (pesewas for GHS, etc.)
--           e.g. GH₵ 1.00 = 100
-- Soft deletes: deleted_at on mutable tables
-- Audit: every mutation captured in audit_logs
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "moddatetime";  -- auto-update updated_at


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Organization roles
create type org_role as enum (
  'owner',          -- org creator; can manage billing + delete org
  'admin',          -- can manage members, settings, integrations
  'finance_lead',   -- full financial access (typical power user)
  'accountant',     -- books, invoices, bills, chart of accounts
  'employee',       -- submit expenses, see own card/reimbursements
  'viewer'          -- read-only across all modules
);

-- SaaS subscription tiers
create type subscription_tier as enum ('free', 'starter', 'growth', 'enterprise');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'paused');

-- Bank account types
create type bank_account_type as enum ('bank', 'mobile_money', 'cash', 'crypto');

-- Transaction direction
create type txn_direction as enum ('credit', 'debit');

-- Transaction status (for the "Pass to Books" workflow)
create type txn_status as enum ('pending', 'categorized', 'posted');

-- Transaction type (once categorized)
create type txn_type as enum ('revenue', 'expense');

-- Card type
create type card_type as enum ('virtual', 'physical');
create type card_status as enum ('active', 'frozen', 'cancelled', 'pending_activation');

-- Expense status
create type expense_status as enum ('draft', 'submitted', 'approved', 'rejected', 'reimbursed');

-- Approval decision
create type approval_decision as enum ('pending', 'approved', 'rejected', 'escalated');

-- GL account types
create type account_type as enum ('asset', 'liability', 'equity', 'revenue', 'expense');
create type account_subtype as enum (
  'current_asset', 'fixed_asset', 'other_asset',
  'current_liability', 'long_term_liability',
  'equity',
  'operating_revenue', 'other_revenue',
  'cost_of_goods_sold', 'operating_expense', 'other_expense'
);

-- Journal entry status
create type journal_status as enum ('draft', 'posted', 'reversed');

-- Invoice / bill status
create type invoice_status as enum ('draft', 'sent', 'overdue', 'paid', 'void', 'partially_paid');
create type bill_status as enum ('inbox', 'pending', 'scheduled', 'paid', 'overdue', 'void');

-- Reimbursement status
create type reimbursement_status as enum ('draft', 'submitted', 'approved', 'paid', 'rejected');

-- Revenue record status
create type revenue_status as enum ('received', 'pending', 'partial');

-- Month-end close
create type close_period_status as enum ('open', 'in_progress', 'locked');
create type checklist_item_status as enum ('pending', 'in_progress', 'completed', 'flagged');

-- Payment method
create type payment_method as enum ('bank_transfer', 'mobile_money', 'cash', 'pos_card', 'cheque');

-- Currency codes (Africa-first + majors)
create type currency_code as enum ('GHS', 'NGN', 'KES', 'ZAR', 'USD', 'GBP', 'EUR');

-- Notification channels
create type notification_channel as enum ('in_app', 'email', 'sms', 'push');

-- Integration providers
create type integration_provider as enum (
  'quickbooks', 'xero', 'sage', 'zoho_books',
  'stripe', 'paystack', 'flutterwave', 'mtn_momo', 'airtel_money',
  'ecobank_api', 'gcb_api',
  'sendgrid', 'mailchimp',
  'slack', 'microsoft_teams',
  'google_drive', 'dropbox',
  'hubspot', 'salesforce'
);
create type integration_status as enum ('connected', 'disconnected', 'error', 'pending_auth');
create type sync_status as enum ('success', 'partial', 'failed', 'running');

-- Audit action verbs
create type audit_action as enum (
  'create', 'update', 'delete', 'view',
  'approve', 'reject', 'post', 'reverse',
  'freeze', 'unfreeze', 'cancel',
  'login', 'logout', 'invite', 'remove_member',
  'export', 'import', 'connect', 'disconnect'
);

-- Superadmin audit actions
create type platform_audit_action as enum (
  'org_created', 'org_suspended', 'org_reinstated', 'org_deleted',
  'plan_changed', 'invoice_issued', 'refund_issued',
  'admin_login', 'impersonate_start', 'impersonate_end',
  'feature_flag_updated', 'broadcast_sent'
);


-- =============================================================================
-- 2. CORE PLATFORM TABLES (no org scoping — platform-level)
-- =============================================================================

-- ── 2.1 Organizations ──────────────────────────────────────────────────────────
create table organizations (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  slug              text not null unique,                         -- e.g. "acme-ghana"
  logo_url          text,
  website           text,
  industry          text,
  country_code      char(2) not null default 'GH',
  base_currency     currency_code not null default 'GHS',
  tin               text,                                         -- Tax Identification Number (encrypted at app level)
  timezone          text not null default 'Africa/Accra',
  fiscal_year_start smallint not null default 1,                  -- month number 1-12
  is_suspended      boolean not null default false,
  suspended_reason  text,
  trial_ends_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index on organizations (slug);
create index on organizations (deleted_at) where deleted_at is null;
create trigger set_updated_at before update on organizations
  for each row execute function moddatetime(updated_at);

-- ── 2.2 Profiles (extends auth.users) ─────────────────────────────────────────
-- One profile per Supabase auth user. The profile is created on first sign-up
-- via a Postgres trigger on auth.users.
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  avatar_url        text,
  phone             text,                                         -- E.164 format; encrypted at app level
  job_title         text,
  is_platform_admin boolean not null default false,               -- superadmin flag
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger set_updated_at before update on profiles
  for each row execute function moddatetime(updated_at);

-- ── 2.3 Organization Members ───────────────────────────────────────────────────
create table organization_members (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  role            org_role not null default 'employee',
  department_id   uuid,                                           -- FK added later (circular dep)
  invited_by      uuid references profiles(id),
  accepted_at     timestamptz,
  deactivated_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on organization_members (organization_id);
create index on organization_members (user_id);
create trigger set_updated_at before update on organization_members
  for each row execute function moddatetime(updated_at);

-- ── 2.4 SaaS Plans (catalogue) ────────────────────────────────────────────────
create table saas_plans (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,                          -- "Starter", "Growth", etc.
  tier                    subscription_tier not null unique,
  price_monthly_usd_cents integer not null default 0,
  price_annually_usd_cents integer not null default 0,
  max_members             integer,                                -- null = unlimited
  max_transactions_pm     integer,                                -- per month
  max_cards               integer,
  has_ai_copilot          boolean not null default false,
  has_api_access          boolean not null default false,
  has_custom_roles        boolean not null default false,
  stripe_monthly_price_id text,
  stripe_annual_price_id  text,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);

-- ── 2.5 Organization Subscriptions ────────────────────────────────────────────
create table org_subscriptions (
  id                       uuid primary key default uuid_generate_v4(),
  organization_id          uuid not null unique references organizations(id) on delete cascade,
  plan_id                  uuid not null references saas_plans(id),
  status                   subscription_status not null default 'trialing',
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  stripe_price_id          text,
  billing_email            text,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at                timestamptz,
  cancelled_at             timestamptz,
  trial_start              timestamptz,
  trial_end                timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create trigger set_updated_at before update on org_subscriptions
  for each row execute function moddatetime(updated_at);

-- ── 2.6 Feature Flags ─────────────────────────────────────────────────────────
create table feature_flags (
  id              uuid primary key default uuid_generate_v4(),
  key             text not null unique,                           -- e.g. "ai_copilot_enabled"
  description     text,
  enabled_global  boolean not null default false,
  enabled_for_orgs uuid[] default '{}',                          -- allowlist override
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger set_updated_at before update on feature_flags
  for each row execute function moddatetime(updated_at);

-- ── 2.7 Platform Audit Log (superadmin actions) ────────────────────────────────
create table platform_audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  actor_id        uuid references profiles(id),                   -- null if system
  action          platform_audit_action not null,
  target_org_id   uuid references organizations(id),
  target_user_id  uuid references profiles(id),
  metadata        jsonb default '{}',
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index on platform_audit_logs (actor_id);
create index on platform_audit_logs (target_org_id);
create index on platform_audit_logs (created_at desc);

-- ── 2.8 Stripe Webhook Events ─────────────────────────────────────────────────
create table stripe_webhook_events (
  id               uuid primary key default uuid_generate_v4(),
  stripe_event_id  text not null unique,
  event_type       text not null,
  api_version      text,
  payload          jsonb not null,
  processed        boolean not null default false,
  processed_at     timestamptz,
  error            text,
  created_at       timestamptz not null default now()
);
create index on stripe_webhook_events (stripe_event_id);
create index on stripe_webhook_events (processed) where processed = false;


-- =============================================================================
-- 3. ORG-SCOPED FOUNDATION
-- =============================================================================

-- ── 3.1 Departments ───────────────────────────────────────────────────────────
create table departments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text,
  budget_amount   bigint default 0,                               -- minor units
  currency        currency_code not null default 'GHS',
  manager_id      uuid references organization_members(id),
  parent_id       uuid references departments(id),               -- hierarchy
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);
create index on departments (organization_id);
create trigger set_updated_at before update on departments
  for each row execute function moddatetime(updated_at);

-- backfill FK on organization_members
alter table organization_members
  add constraint fk_dept foreign key (department_id) references departments(id);

-- ── 3.2 Organization Settings ─────────────────────────────────────────────────
create table organization_settings (
  id                          uuid primary key default uuid_generate_v4(),
  organization_id             uuid not null unique references organizations(id) on delete cascade,
  -- Accounting
  revenue_recognition_method  text not null default 'accrual',   -- 'accrual' | 'cash'
  default_tax_rate            numeric(5,2) not null default 0,
  default_payment_terms       text not null default 'Net 30',
  -- Approval policies
  expense_approval_threshold  bigint default 50000,              -- GHS 500 (in pesewas)
  card_txn_approval_threshold bigint default 200000,             -- GHS 2,000
  require_receipts_above      bigint default 10000,              -- GHS 100
  -- Notifications
  notify_on_new_bill          boolean not null default true,
  notify_on_approval_needed   boolean not null default true,
  notify_on_overdue_invoice   boolean not null default true,
  -- Branding
  invoice_logo_url            text,
  invoice_color_hex           char(7) default '#22C55E',
  invoice_footer_text         text,
  -- Compliance
  ghana_dpa_consent_required  boolean not null default true,
  data_retention_years        smallint not null default 7,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create trigger set_updated_at before update on organization_settings
  for each row execute function moddatetime(updated_at);

-- ── 3.3 Notification Preferences (per member) ─────────────────────────────────
create table notification_preferences (
  id              uuid primary key default uuid_generate_v4(),
  member_id       uuid not null references organization_members(id) on delete cascade,
  event_type      text not null,                                  -- e.g. 'approval_needed'
  channels        notification_channel[] not null default '{in_app}',
  is_enabled      boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (member_id, event_type)
);
create index on notification_preferences (member_id);

-- ── 3.4 Notifications (in-app inbox) ──────────────────────────────────────────
create table notifications (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  action_url      text,
  metadata        jsonb default '{}',
  is_read         boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on notifications (user_id, is_read);
create index on notifications (organization_id, created_at desc);

-- ── 3.5 Audit Logs (org-level mutations) ──────────────────────────────────────
create table audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id        uuid references profiles(id),
  action          audit_action not null,
  table_name      text not null,
  record_id       uuid,
  old_data        jsonb,
  new_data        jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now()
);
create index on audit_logs (organization_id, created_at desc);
create index on audit_logs (actor_id);
create index on audit_logs (table_name, record_id);


-- =============================================================================
-- 4. BANKING & TRANSACTIONS
-- =============================================================================

-- ── 4.1 Bank Accounts ─────────────────────────────────────────────────────────
-- Represents a connected account: bank, mobile money wallet, or cash account.
create table bank_accounts (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,                            -- "MTN MoMo", "Ecobank Savings"
  slug                  text not null,                            -- "mtn", "ecobank", "gcb"
  type                  bank_account_type not null default 'bank',
  institution_name      text,
  account_number_masked text,                                     -- last 4 digits only
  account_number_enc    text,                                     -- AES-256 encrypted at app level
  currency              currency_code not null default 'GHS',
  current_balance       bigint not null default 0,                -- minor units
  is_default            boolean not null default false,
  is_active             boolean not null default true,
  color                 text default '#9CA3AF',                   -- UI dot color
  integration_id        uuid,                                     -- FK added after integrations table
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index on bank_accounts (organization_id);
create trigger set_updated_at before update on bank_accounts
  for each row execute function moddatetime(updated_at);

-- ── 4.2 Transaction Categories ────────────────────────────────────────────────
create table transaction_categories (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,  -- null = system default
  name            text not null,
  emoji           text,
  type            txn_type not null,
  gl_account_id   uuid,                                           -- FK added after chart_of_accounts
  is_system       boolean not null default false,
  is_active       boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);
create index on transaction_categories (organization_id);

-- ── 4.3 Transactions ──────────────────────────────────────────────────────────
-- All bank/mobile money transactions imported or manually entered.
-- The "Pass to Books" workflow moves status: pending → categorized → posted.
create table transactions (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  bank_account_id     uuid not null references bank_accounts(id),
  reference           text,                                       -- bank reference number
  description         text not null,
  direction           txn_direction not null,
  amount              bigint not null,                            -- minor units (always positive)
  currency            currency_code not null default 'GHS',
  status              txn_status not null default 'pending',
  type                txn_type,                                   -- set when categorized
  category_id         uuid references transaction_categories(id),
  gl_account_id       uuid,                                       -- FK after chart_of_accounts
  journal_entry_id    uuid,                                       -- FK after journal_entries
  note                text,
  txn_date            date not null,
  posted_date         date,
  posted_by           uuid references profiles(id),
  posted_at           timestamptz,
  source              text,                                       -- 'import', 'manual', 'api_sync'
  external_id         text,                                       -- id from bank API (dedup)
  receipt_url         text,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (organization_id, bank_account_id, external_id)
);
create index on transactions (organization_id, status);
create index on transactions (organization_id, txn_date desc);
create index on transactions (bank_account_id);
create index on transactions (category_id);
create trigger set_updated_at before update on transactions
  for each row execute function moddatetime(updated_at);


-- =============================================================================
-- 5. CARDS
-- =============================================================================

-- ── 5.1 Cards ─────────────────────────────────────────────────────────────────
create table cards (
  id                   uuid primary key default uuid_generate_v4(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  member_id            uuid not null references organization_members(id),
  type                 card_type not null default 'virtual',
  status               card_status not null default 'active',
  last_four            char(4) not null,
  expiry_month         smallint,
  expiry_year          smallint,
  -- Limits
  monthly_limit        bigint,                                    -- minor units; null = unlimited
  single_txn_limit     bigint,
  -- Spend tracking (reset monthly via cron/trigger)
  spent_mtd            bigint not null default 0,
  -- External
  processor_card_id    text,                                      -- ID from card processor (e.g. Stripe Issuing)
  processor            text,                                      -- 'stripe_issuing', 'sudo_africa', etc.
  -- Metadata
  label                text,                                      -- optional display name
  department_id        uuid references departments(id),
  issued_by            uuid references profiles(id),
  cancelled_at         timestamptz,
  cancelled_reason     text,
  frozen_at            timestamptz,
  frozen_by            uuid references profiles(id),
  frozen_reason        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on cards (organization_id);
create index on cards (member_id);
create index on cards (status);
create trigger set_updated_at before update on cards
  for each row execute function moddatetime(updated_at);

-- ── 5.2 Card Transactions ─────────────────────────────────────────────────────
create table card_transactions (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  card_id         uuid not null references cards(id),
  merchant_name   text not null,
  merchant_mcc    text,                                           -- Merchant Category Code
  amount          bigint not null,
  currency        currency_code not null default 'GHS',
  direction       txn_direction not null default 'debit',
  status          text not null default 'pending',               -- 'pending' | 'approved' | 'rejected' | 'flagged'
  gl_account_id   uuid,
  category_id     uuid references transaction_categories(id),
  receipt_url     text,
  note            text,
  policy_passed   boolean,
  approval_id     uuid,                                           -- FK after approvals
  external_id     text unique,
  txn_date        timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on card_transactions (organization_id, card_id);
create index on card_transactions (organization_id, status);
create index on card_transactions (txn_date desc);
create trigger set_updated_at before update on card_transactions
  for each row execute function moddatetime(updated_at);

-- ── 5.3 Card Spend Policies ───────────────────────────────────────────────────
create table card_policies (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  rules           jsonb not null default '[]',
  -- Example rule: {"type": "mcc_block", "codes": ["7995","9754"]}
  -- Example rule: {"type": "amount_limit", "max_amount": 50000}
  -- Example rule: {"type": "merchant_allowlist", "merchants": ["AWS","Stripe"]}
  is_default      boolean not null default false,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on card_policies (organization_id);
create trigger set_updated_at before update on card_policies
  for each row execute function moddatetime(updated_at);


-- =============================================================================
-- 6. EXPENSES & APPROVALS
-- =============================================================================

-- ── 6.1 Expenses ──────────────────────────────────────────────────────────────
create table expenses (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id       uuid not null references organization_members(id),
  merchant_name   text not null,
  amount          bigint not null,
  currency        currency_code not null default 'GHS',
  expense_date    date not null,
  category_id     uuid references transaction_categories(id),
  gl_account_id   uuid,
  department_id   uuid references departments(id),
  description     text,
  status          expense_status not null default 'draft',
  is_reimbursable boolean not null default true,
  reimbursement_id uuid,                                         -- FK after reimbursements
  card_txn_id     uuid references card_transactions(id),
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  rejected_by     uuid references profiles(id),
  rejected_at     timestamptz,
  rejection_reason text,
  submitted_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on expenses (organization_id, status);
create index on expenses (member_id);
create trigger set_updated_at before update on expenses
  for each row execute function moddatetime(updated_at);

-- ── 6.2 Expense Attachments (receipts, etc.) ──────────────────────────────────
create table expense_attachments (
  id          uuid primary key default uuid_generate_v4(),
  expense_id  uuid not null references expenses(id) on delete cascade,
  storage_key text not null,                                     -- Supabase Storage path
  filename    text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index on expense_attachments (expense_id);

-- ── 6.3 Approval Requests ─────────────────────────────────────────────────────
create table approval_requests (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  request_type     text not null,                                -- 'card_txn' | 'expense' | 'bill' | 'journal'
  reference_id     uuid not null,                                -- ID in the respective table
  requestor_id     uuid not null references profiles(id),
  assignee_id      uuid references profiles(id),
  amount           bigint,
  currency         currency_code,
  description      text,
  decision         approval_decision not null default 'pending',
  decided_by       uuid references profiles(id),
  decided_at       timestamptz,
  decision_note    text,
  escalated_to_id  uuid references profiles(id),
  due_by           timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on approval_requests (organization_id, decision);
create index on approval_requests (assignee_id, decision);
create trigger set_updated_at before update on approval_requests
  for each row execute function moddatetime(updated_at);

-- ── 6.4 Approval Comments ─────────────────────────────────────────────────────
create table approval_comments (
  id          uuid primary key default uuid_generate_v4(),
  approval_id uuid not null references approval_requests(id) on delete cascade,
  author_id   uuid not null references profiles(id),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index on approval_comments (approval_id);


-- =============================================================================
-- 7. CHART OF ACCOUNTS & JOURNAL ENTRIES
-- =============================================================================

-- ── 7.1 Chart of Accounts ─────────────────────────────────────────────────────
create table chart_of_accounts (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  code            text not null,                                 -- 4-digit GL code, e.g. "4100"
  name            text not null,
  type            account_type not null,
  subtype         account_subtype,
  description     text,
  parent_id       uuid references chart_of_accounts(id),
  currency        currency_code not null default 'GHS',
  current_balance bigint not null default 0,                     -- denormalized, updated by trigger
  is_active       boolean not null default true,
  is_system       boolean not null default false,                -- system defaults; can't be deleted
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);
create index on chart_of_accounts (organization_id, type);
create index on chart_of_accounts (organization_id, code);
create trigger set_updated_at before update on chart_of_accounts
  for each row execute function moddatetime(updated_at);

-- backfill FKs that depend on chart_of_accounts
alter table transaction_categories
  add constraint fk_gl foreign key (gl_account_id) references chart_of_accounts(id);
alter table transactions
  add constraint fk_gl foreign key (gl_account_id) references chart_of_accounts(id);
alter table card_transactions
  add constraint fk_gl foreign key (gl_account_id) references chart_of_accounts(id);
alter table expenses
  add constraint fk_gl foreign key (gl_account_id) references chart_of_accounts(id);

-- ── 7.2 Financial Periods ─────────────────────────────────────────────────────
create table financial_periods (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,                                 -- e.g. "April 2026"
  period_year     smallint not null,
  period_month    smallint not null,                             -- 1-12
  is_closed       boolean not null default false,
  closed_by       uuid references profiles(id),
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, period_year, period_month)
);
create index on financial_periods (organization_id, period_year, period_month);

-- ── 7.3 Journal Entries ───────────────────────────────────────────────────────
create table journal_entries (
  id                uuid primary key default uuid_generate_v4(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  period_id         uuid references financial_periods(id),
  entry_number      text not null,                              -- e.g. "JE-2026-0047"
  type              text not null,                              -- 'accrual' | 'depreciation' | 'prepaid' | 'revenue_recognition' | 'reclassification' | 'manual'
  description       text not null,
  reference         text,
  entry_date        date not null,
  status            journal_status not null default 'draft',
  total_debit       bigint not null default 0,
  total_credit      bigint not null default 0,
  currency          currency_code not null default 'GHS',
  posted_by         uuid references profiles(id),
  posted_at         timestamptz,
  reversed_by       uuid references profiles(id),
  reversed_at       timestamptz,
  reversal_of       uuid references journal_entries(id),
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on journal_entries (organization_id, status);
create index on journal_entries (organization_id, entry_date desc);
create index on journal_entries (period_id);
create trigger set_updated_at before update on journal_entries
  for each row execute function moddatetime(updated_at);

-- ── 7.4 Journal Entry Lines ───────────────────────────────────────────────────
create table journal_entry_lines (
  id              uuid primary key default uuid_generate_v4(),
  journal_id      uuid not null references journal_entries(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  line_number     smallint not null,
  account_id      uuid not null references chart_of_accounts(id),
  description     text,
  debit_amount    bigint not null default 0,
  credit_amount   bigint not null default 0,
  created_at      timestamptz not null default now()
);
create index on journal_entry_lines (journal_id);
create index on journal_entry_lines (account_id);

-- ── 7.5 Journal Entry Attachments ─────────────────────────────────────────────
create table journal_entry_attachments (
  id          uuid primary key default uuid_generate_v4(),
  journal_id  uuid not null references journal_entries(id) on delete cascade,
  storage_key text not null,
  filename    text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references profiles(id),
  created_at  timestamptz not null default now()
);
create index on journal_entry_attachments (journal_id);

-- backfill FK: transactions → journal_entries
alter table transactions
  add constraint fk_journal foreign key (journal_entry_id) references journal_entries(id);


-- =============================================================================
-- 8. MONTH-END CLOSE
-- =============================================================================

-- ── 8.1 Close Periods ─────────────────────────────────────────────────────────
create table close_periods (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_id       uuid not null references financial_periods(id),
  status          close_period_status not null default 'open',
  opened_at       timestamptz not null default now(),
  target_close    date,
  closed_at       timestamptz,
  closed_by       uuid references profiles(id),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, period_id)
);
create trigger set_updated_at before update on close_periods
  for each row execute function moddatetime(updated_at);

-- ── 8.2 Close Checklist Items ─────────────────────────────────────────────────
create table close_checklist_items (
  id              uuid primary key default uuid_generate_v4(),
  close_period_id uuid not null references close_periods(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  stage           text not null,                               -- 'data_collection' | 'reconciliation' | 'review' | 'approval' | 'reporting'
  title           text not null,
  description     text,
  assignee_id     uuid references organization_members(id),
  due_date        date,
  status          checklist_item_status not null default 'pending',
  sort_order      smallint not null default 0,
  completed_by    uuid references profiles(id),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on close_checklist_items (close_period_id);
create trigger set_updated_at before update on close_checklist_items
  for each row execute function moddatetime(updated_at);

-- ── 8.3 Close Issues ──────────────────────────────────────────────────────────
create table close_issues (
  id              uuid primary key default uuid_generate_v4(),
  close_period_id uuid not null references close_periods(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  title           text not null,
  description     text,
  severity        text not null default 'medium',              -- 'low' | 'medium' | 'high' | 'critical'
  assigned_to     uuid references organization_members(id),
  is_resolved     boolean not null default false,
  resolved_at     timestamptz,
  resolved_by     uuid references profiles(id),
  resolution_note text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on close_issues (close_period_id, is_resolved);
create trigger set_updated_at before update on close_issues
  for each row execute function moddatetime(updated_at);

-- ── 8.4 Close Activity Log ────────────────────────────────────────────────────
create table close_activity_log (
  id              uuid primary key default uuid_generate_v4(),
  close_period_id uuid not null references close_periods(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id        uuid references profiles(id),
  action_text     text not null,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);
create index on close_activity_log (close_period_id, created_at desc);


-- =============================================================================
-- 9. CLIENTS & INVOICING
-- =============================================================================

-- ── 9.1 Clients ───────────────────────────────────────────────────────────────
create table clients (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address_line1   text,
  address_line2   text,
  city            text,
  country_code    char(2),
  tax_number      text,                                         -- encrypted at app level
  currency        currency_code not null default 'GHS',
  payment_terms   text not null default 'Net 30',
  notes           text,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on clients (organization_id);
create trigger set_updated_at before update on clients
  for each row execute function moddatetime(updated_at);

-- ── 9.2 Invoices ──────────────────────────────────────────────────────────────
create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_number  text not null,                                -- e.g. "INV-2026-047"
  client_id       uuid references clients(id),
  client_name     text not null,                                -- denormalized for snapshot
  client_email    text,
  status          invoice_status not null default 'draft',
  currency        currency_code not null default 'GHS',
  subtotal        bigint not null default 0,
  tax_rate        numeric(5,2) not null default 0,
  tax_amount      bigint not null default 0,
  discount_amount bigint not null default 0,
  total_amount    bigint not null default 0,
  paid_amount     bigint not null default 0,
  invoice_date    date,
  due_date        date,
  payment_terms   text not null default 'Net 30',
  notes           text,
  period_id       uuid references financial_periods(id),
  sent_at         timestamptz,
  paid_at         timestamptz,
  voided_at       timestamptz,
  voided_by       uuid references profiles(id),
  pdf_storage_key text,                                        -- Supabase Storage
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (organization_id, invoice_number)
);
create index on invoices (organization_id, status);
create index on invoices (client_id);
create index on invoices (due_date) where status not in ('paid', 'void');
create trigger set_updated_at before update on invoices
  for each row execute function moddatetime(updated_at);

-- ── 9.3 Invoice Line Items ────────────────────────────────────────────────────
create table invoice_line_items (
  id              uuid primary key default uuid_generate_v4(),
  invoice_id      uuid not null references invoices(id) on delete cascade,
  sort_order      smallint not null default 0,
  description     text not null,
  quantity        numeric(10,3) not null default 1,
  unit_price      bigint not null default 0,
  amount          bigint not null default 0,                   -- quantity × unit_price
  gl_account_id   uuid references chart_of_accounts(id),
  created_at      timestamptz not null default now()
);
create index on invoice_line_items (invoice_id);

-- ── 9.4 Invoice Payments ──────────────────────────────────────────────────────
create table invoice_payments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id      uuid not null references invoices(id),
  amount          bigint not null,
  currency        currency_code not null default 'GHS',
  payment_method  payment_method,
  payment_date    date not null,
  reference       text,
  note            text,
  recorded_by     uuid references profiles(id),
  created_at      timestamptz not null default now()
);
create index on invoice_payments (invoice_id);


-- =============================================================================
-- 10. VENDORS & BILLS
-- =============================================================================

-- ── 10.1 Bill Vendors ─────────────────────────────────────────────────────────
-- "Vendor" in the bills/AP context (not related to the zanaweds marketplace)
create table bill_vendors (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  tax_number      text,
  currency        currency_code not null default 'GHS',
  payment_terms   text not null default 'Net 30',
  category        text,                                         -- "Telecom", "Utilities", etc.
  notes           text,
  is_active       boolean not null default true,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on bill_vendors (organization_id);
create trigger set_updated_at before update on bill_vendors
  for each row execute function moddatetime(updated_at);

-- ── 10.2 Bills ────────────────────────────────────────────────────────────────
create table bills (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  bill_number         text not null,
  vendor_id           uuid references bill_vendors(id),
  vendor_name         text not null,                           -- snapshot
  status              bill_status not null default 'pending',
  currency            currency_code not null default 'GHS',
  amount              bigint not null,
  paid_amount         bigint not null default 0,
  category            text,
  gl_account_id       uuid references chart_of_accounts(id),
  period_id           uuid references financial_periods(id),
  bill_date           date,
  due_date            date,
  payment_method      payment_method,
  payment_date        date,
  reference           text,
  notes               text,
  auto_captured       boolean not null default false,          -- from email parsing
  capture_confidence  text,                                    -- 'high' | 'medium' | 'low'
  capture_source      text,                                    -- 'email' | 'ocr' | 'manual'
  pdf_storage_key     text,
  approved_by         uuid references profiles(id),
  approved_at         timestamptz,
  scheduled_pay_date  date,
  created_by          uuid references profiles(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (organization_id, bill_number)
);
create index on bills (organization_id, status);
create index on bills (due_date) where status not in ('paid', 'void');
create trigger set_updated_at before update on bills
  for each row execute function moddatetime(updated_at);

-- ── 10.3 Bill Inbox (auto-captured, unreviewed) ───────────────────────────────
create table bill_inbox (
  id                  uuid primary key default uuid_generate_v4(),
  organization_id     uuid not null references organizations(id) on delete cascade,
  raw_vendor_name     text,
  raw_amount          text,
  raw_date            text,
  parsed_vendor_name  text,
  parsed_amount       bigint,
  parsed_date         date,
  confidence          text not null default 'medium',
  source              text not null default 'email',
  source_metadata     jsonb default '{}',                      -- email subject, sender, etc.
  email_storage_key   text,
  is_dismissed        boolean not null default false,
  bill_id             uuid references bills(id),               -- set when added to bills
  created_at          timestamptz not null default now()
);
create index on bill_inbox (organization_id, is_dismissed);


-- =============================================================================
-- 11. REIMBURSEMENTS
-- =============================================================================

-- ── 11.1 Reimbursement Requests ───────────────────────────────────────────────
create table reimbursement_requests (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id       uuid not null references organization_members(id),
  title           text not null,
  description     text,
  total_amount    bigint not null,
  currency        currency_code not null default 'GHS',
  status          reimbursement_status not null default 'draft',
  submitted_at    timestamptz,
  approved_by     uuid references profiles(id),
  approved_at     timestamptz,
  rejected_by     uuid references profiles(id),
  rejected_at     timestamptz,
  rejection_reason text,
  paid_at         timestamptz,
  payment_method  payment_method,
  payment_reference text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on reimbursement_requests (organization_id, status);
create index on reimbursement_requests (member_id);
create trigger set_updated_at before update on reimbursement_requests
  for each row execute function moddatetime(updated_at);

-- ── 11.2 Reimbursement Line Items ─────────────────────────────────────────────
create table reimbursement_items (
  id                  uuid primary key default uuid_generate_v4(),
  reimbursement_id    uuid not null references reimbursement_requests(id) on delete cascade,
  expense_id          uuid references expenses(id),
  description         text not null,
  merchant_name       text,
  amount              bigint not null,
  expense_date        date not null,
  category_id         uuid references transaction_categories(id),
  receipt_storage_key text,
  created_at          timestamptz not null default now()
);
create index on reimbursement_items (reimbursement_id);

-- backfill FK on expenses
alter table expenses
  add constraint fk_reimbursement foreign key (reimbursement_id) references reimbursement_requests(id);


-- =============================================================================
-- 12. REVENUE RECORDS
-- =============================================================================

create table revenue_records (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  ref_number      text not null,                                -- e.g. "REV-2026-041"
  payer_name      text not null,
  client_id       uuid references clients(id),
  invoice_id      uuid references invoices(id),                -- optional link to invoice
  amount          bigint not null,
  currency        currency_code not null default 'GHS',
  status          revenue_status not null default 'received',
  category_id     uuid references transaction_categories(id),
  gl_account_id   uuid references chart_of_accounts(id),
  payment_method  payment_method,
  period_id       uuid references financial_periods(id),
  revenue_date    date not null,
  period_label    text,                                        -- e.g. "Apr 2026"
  note            text,
  journal_id      uuid references journal_entries(id),
  transaction_id  uuid references transactions(id),
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (organization_id, ref_number)
);
create index on revenue_records (organization_id, status);
create index on revenue_records (organization_id, revenue_date desc);
create index on revenue_records (period_id);
create trigger set_updated_at before update on revenue_records
  for each row execute function moddatetime(updated_at);


-- =============================================================================
-- 13. INTEGRATIONS
-- =============================================================================

create table integrations (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider        integration_provider not null,
  status          integration_status not null default 'disconnected',
  display_name    text,
  -- OAuth / API creds (encrypted at app layer with AES-256)
  access_token_enc  text,
  refresh_token_enc text,
  token_expires_at  timestamptz,
  api_key_enc       text,
  webhook_secret_enc text,
  -- Config
  config          jsonb default '{}',
  -- e.g. {"sync_frequency": "daily", "map_accounts": {...}}
  last_synced_at  timestamptz,
  connected_by    uuid references profiles(id),
  disconnected_by uuid references profiles(id),
  disconnected_at timestamptz,
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, provider)
);
create index on integrations (organization_id);
create trigger set_updated_at before update on integrations
  for each row execute function moddatetime(updated_at);

-- backfill FK: bank_accounts → integrations
alter table bank_accounts
  add constraint fk_integration foreign key (integration_id) references integrations(id);

-- ── 13.1 Integration Sync Logs ────────────────────────────────────────────────
create table integration_sync_logs (
  id              uuid primary key default uuid_generate_v4(),
  integration_id  uuid not null references integrations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  status          sync_status not null,
  records_synced  integer default 0,
  records_failed  integer default 0,
  error_details   jsonb,
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index on integration_sync_logs (integration_id, started_at desc);


-- =============================================================================
-- 14. AI COPILOT
-- =============================================================================

create table copilot_conversations (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  title           text,                                         -- auto-generated from first message
  model           text not null default 'claude-opus-4',
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on copilot_conversations (organization_id, user_id);
create trigger set_updated_at before update on copilot_conversations
  for each row execute function moddatetime(updated_at);

create table copilot_messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references copilot_conversations(id) on delete cascade,
  organization_id  uuid not null references organizations(id) on delete cascade,
  role             text not null,                               -- 'user' | 'assistant' | 'tool'
  content          text not null,
  tool_name        text,                                        -- if role = 'tool'
  tool_input       jsonb,
  tool_output      jsonb,
  input_tokens     integer,
  output_tokens    integer,
  latency_ms       integer,
  created_at       timestamptz not null default now()
);
create index on copilot_messages (conversation_id, created_at asc);


-- =============================================================================
-- 15. ANALYTICS & REPORTING
-- =============================================================================

create table saved_reports (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_by      uuid not null references profiles(id),
  name            text not null,
  description     text,
  report_type     text not null,                               -- 'pl' | 'balance_sheet' | 'cash_flow' | 'custom'
  config          jsonb not null default '{}',
  -- e.g. {"period": "ytd", "compare_prior": true, "filters": {...}}
  is_shared       boolean not null default false,
  last_run_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on saved_reports (organization_id);
create trigger set_updated_at before update on saved_reports
  for each row execute function moddatetime(updated_at);

create table dashboard_widgets (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  member_id       uuid not null references organization_members(id),
  widget_type     text not null,                               -- 'kpi_card' | 'chart' | 'table' | 'metric'
  title           text not null,
  config          jsonb not null default '{}',
  position_x      smallint not null default 0,
  position_y      smallint not null default 0,
  width           smallint not null default 2,
  height          smallint not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on dashboard_widgets (member_id);
create trigger set_updated_at before update on dashboard_widgets
  for each row execute function moddatetime(updated_at);


-- =============================================================================
-- 16. PEOPLE & TEAMS
-- =============================================================================

create table teams (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  lead_id         uuid references organization_members(id),
  color           text default '#22C55E',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on teams (organization_id);
create trigger set_updated_at before update on teams
  for each row execute function moddatetime(updated_at);

create table team_members (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references teams(id) on delete cascade,
  member_id   uuid not null references organization_members(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  unique (team_id, member_id)
);
create index on team_members (team_id);

-- ── Invitations ───────────────────────────────────────────────────────────────
create table member_invitations (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role            org_role not null default 'employee',
  department_id   uuid references departments(id),
  token_hash      text not null unique,                        -- SHA-256 of invite token
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  invited_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now()
);
create index on member_invitations (organization_id);
create index on member_invitations (token_hash);


-- =============================================================================
-- 17. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Every table is locked down. Org members can only see their org's data.
-- Superadmins (profiles.is_platform_admin = true) bypass org isolation.

-- Helper function: get the current user's org membership
create or replace function current_user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id
  from organization_members
  where user_id = auth.uid()
    and deactivated_at is null;
$$;

-- Helper: check if current user is a member of a specific org
create or replace function is_org_member(org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and deactivated_at is null
  );
$$;

-- Helper: get the current user's role in a specific org
create or replace function my_org_role(org_id uuid)
returns org_role
language sql
security definer
stable
as $$
  select role
  from organization_members
  where organization_id = org_id
    and user_id = auth.uid()
    and deactivated_at is null
  limit 1;
$$;

-- Helper: check if current user is a superadmin
create or replace function is_platform_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(is_platform_admin, false)
  from profiles
  where id = auth.uid();
$$;

-- Enable RLS on all tables
alter table organizations             enable row level security;
alter table profiles                  enable row level security;
alter table organization_members      enable row level security;
alter table saas_plans                enable row level security;
alter table org_subscriptions         enable row level security;
alter table feature_flags             enable row level security;
alter table platform_audit_logs       enable row level security;
alter table stripe_webhook_events     enable row level security;
alter table departments               enable row level security;
alter table organization_settings     enable row level security;
alter table notification_preferences  enable row level security;
alter table notifications             enable row level security;
alter table audit_logs                enable row level security;
alter table bank_accounts             enable row level security;
alter table transaction_categories    enable row level security;
alter table transactions              enable row level security;
alter table cards                     enable row level security;
alter table card_transactions         enable row level security;
alter table card_policies             enable row level security;
alter table expenses                  enable row level security;
alter table expense_attachments       enable row level security;
alter table approval_requests         enable row level security;
alter table approval_comments         enable row level security;
alter table chart_of_accounts         enable row level security;
alter table financial_periods         enable row level security;
alter table journal_entries           enable row level security;
alter table journal_entry_lines       enable row level security;
alter table journal_entry_attachments enable row level security;
alter table close_periods             enable row level security;
alter table close_checklist_items     enable row level security;
alter table close_issues              enable row level security;
alter table close_activity_log        enable row level security;
alter table clients                   enable row level security;
alter table invoices                  enable row level security;
alter table invoice_line_items        enable row level security;
alter table invoice_payments          enable row level security;
alter table bill_vendors              enable row level security;
alter table bills                     enable row level security;
alter table bill_inbox                enable row level security;
alter table reimbursement_requests    enable row level security;
alter table reimbursement_items       enable row level security;
alter table revenue_records           enable row level security;
alter table integrations              enable row level security;
alter table integration_sync_logs     enable row level security;
alter table copilot_conversations     enable row level security;
alter table copilot_messages          enable row level security;
alter table saved_reports             enable row level security;
alter table dashboard_widgets         enable row level security;
alter table teams                     enable row level security;
alter table team_members              enable row level security;
alter table member_invitations        enable row level security;
alter table notifications             enable row level security;


-- ── RLS Policies ──────────────────────────────────────────────────────────────

-- profiles: users see own profile; superadmin sees all
create policy "profiles: own row" on profiles
  for all using (id = auth.uid() or is_platform_admin());

-- organizations: visible only to members
create policy "orgs: members only" on organizations
  for select using (is_org_member(id) or is_platform_admin());

create policy "orgs: owner can update" on organizations
  for update using (my_org_role(id) in ('owner', 'admin') or is_platform_admin());

-- Standard org-scoped pattern (applied to most tables):
-- SELECT: org member
-- INSERT: org member with appropriate role
-- UPDATE: org member with appropriate role
-- DELETE: org member with appropriate role (soft-delete preferred)

-- org_subscriptions
create policy "org_sub: member read" on org_subscriptions
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "org_sub: owner manage" on org_subscriptions
  for all using (my_org_role(organization_id) = 'owner' or is_platform_admin());

-- saas_plans: public read (anyone can see plan catalogue)
create policy "saas_plans: public read" on saas_plans
  for select using (true);

-- feature_flags: all authenticated users read; only superadmin writes
create policy "feature_flags: authenticated read" on feature_flags
  for select using (auth.uid() is not null);

create policy "feature_flags: superadmin write" on feature_flags
  for all using (is_platform_admin());

-- platform_audit_logs: only superadmin
create policy "platform_audit: superadmin only" on platform_audit_logs
  for all using (is_platform_admin());

-- Reusable macro pattern for org-scoped tables:
-- (The following policies follow the same org-isolation pattern)

-- departments
create policy "dept: member read" on departments
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "dept: admin write" on departments
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead') or is_platform_admin());

-- bank_accounts
create policy "bank_acc: member read" on bank_accounts
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "bank_acc: finance write" on bank_accounts
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- transactions
create policy "txns: member read" on transactions
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "txns: finance write" on transactions
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- cards: employees only see their own card; finance sees all
create policy "cards: own card or finance" on cards
  for select using (
    is_platform_admin()
    or my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or member_id = (
      select id from organization_members
      where organization_id = cards.organization_id and user_id = auth.uid()
      limit 1
    )
  );

create policy "cards: finance write" on cards
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead') or is_platform_admin());

-- expenses: employees see own; finance/admin sees all
create policy "expenses: own or finance" on expenses
  for select using (
    is_platform_admin()
    or my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or member_id = (
      select id from organization_members
      where organization_id = expenses.organization_id and user_id = auth.uid()
      limit 1
    )
  );

create policy "expenses: employee insert own" on expenses
  for insert with check (
    is_org_member(organization_id)
    and member_id = (
      select id from organization_members
      where organization_id = expenses.organization_id and user_id = auth.uid()
      limit 1
    )
  );

create policy "expenses: finance update" on expenses
  for update using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- approvals: requestor or assignee or finance
create policy "approvals: stakeholder access" on approval_requests
  for select using (
    is_platform_admin()
    or my_org_role(organization_id) in ('owner','admin','finance_lead')
    or requestor_id = auth.uid()
    or assignee_id = auth.uid()
  );

-- chart_of_accounts
create policy "coa: member read" on chart_of_accounts
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "coa: accountant write" on chart_of_accounts
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- journal_entries
create policy "journals: member read" on journal_entries
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "journals: accountant write" on journal_entries
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- invoices
create policy "invoices: member read" on invoices
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "invoices: finance write" on invoices
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- bills
create policy "bills: member read" on bills
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "bills: finance write" on bills
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- revenue_records
create policy "revenue: member read" on revenue_records
  for select using (is_org_member(organization_id) or is_platform_admin());

create policy "revenue: finance write" on revenue_records
  for all using (my_org_role(organization_id) in ('owner','admin','finance_lead','accountant') or is_platform_admin());

-- reimbursements: employees see own; finance sees all
create policy "reimbursements: own or finance" on reimbursement_requests
  for select using (
    is_platform_admin()
    or my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or member_id = (
      select id from organization_members
      where organization_id = reimbursement_requests.organization_id and user_id = auth.uid()
      limit 1
    )
  );

-- integrations
create policy "integrations: admin only" on integrations
  for all using (my_org_role(organization_id) in ('owner','admin') or is_platform_admin());

-- copilot: own conversations only (or finance_lead+ for org context queries)
create policy "copilot_conv: own" on copilot_conversations
  for all using (user_id = auth.uid() or is_platform_admin());

-- notifications: own only
create policy "notifications: own" on notifications
  for all using (user_id = auth.uid() or is_platform_admin());

-- audit_logs: finance_lead+ can read; write is server-only (service role)
create policy "audit_logs: finance read" on audit_logs
  for select using (
    my_org_role(organization_id) in ('owner','admin','finance_lead') or is_platform_admin()
  );


-- =============================================================================
-- 18. FUNCTIONS & TRIGGERS
-- =============================================================================

-- ── 18.1 Auto-create profile on Supabase Auth signup ─────────────────────────
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into profiles (id, full_name, avatar_url)
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
  for each row execute function handle_new_user();

-- ── 18.2 Auto-update chart_of_accounts.current_balance on journal post ────────
create or replace function update_account_balances()
returns trigger
language plpgsql
security definer
as $$
declare
  line journal_entry_lines%rowtype;
  acct chart_of_accounts%rowtype;
begin
  -- Only update balances when a journal entry is posted
  if (TG_OP = 'UPDATE' and new.status = 'posted' and old.status != 'posted') then
    for line in
      select * from journal_entry_lines where journal_id = new.id
    loop
      select * into acct from chart_of_accounts where id = line.account_id;

      -- Normal balance logic:
      -- Assets & Expenses: debit increases balance
      -- Liabilities, Equity, Revenue: credit increases balance
      if acct.type in ('asset', 'expense') then
        update chart_of_accounts
        set current_balance = current_balance + line.debit_amount - line.credit_amount,
            updated_at = now()
        where id = line.account_id;
      else
        update chart_of_accounts
        set current_balance = current_balance + line.credit_amount - line.debit_amount,
            updated_at = now()
        where id = line.account_id;
      end if;
    end loop;
  end if;

  -- Reverse balances on journal reversal
  if (TG_OP = 'UPDATE' and new.status = 'reversed' and old.status = 'posted') then
    for line in
      select * from journal_entry_lines where journal_id = new.id
    loop
      select * into acct from chart_of_accounts where id = line.account_id;
      if acct.type in ('asset', 'expense') then
        update chart_of_accounts
        set current_balance = current_balance - line.debit_amount + line.credit_amount,
            updated_at = now()
        where id = line.account_id;
      else
        update chart_of_accounts
        set current_balance = current_balance - line.credit_amount + line.debit_amount,
            updated_at = now()
        where id = line.account_id;
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create trigger on_journal_status_change
  after update on journal_entries
  for each row execute function update_account_balances();

-- ── 18.3 Validate journal entry is balanced before posting ────────────────────
create or replace function validate_journal_balanced()
returns trigger
language plpgsql
as $$
declare
  total_debit  bigint;
  total_credit bigint;
begin
  if new.status = 'posted' and old.status = 'draft' then
    select
      coalesce(sum(debit_amount), 0),
      coalesce(sum(credit_amount), 0)
    into total_debit, total_credit
    from journal_entry_lines
    where journal_id = new.id;

    if total_debit != total_credit then
      raise exception 'Journal entry is not balanced: debits=% credits=%',
        total_debit, total_credit;
    end if;

    -- Update header totals
    new.total_debit  := total_debit;
    new.total_credit := total_credit;
  end if;
  return new;
end;
$$;

create trigger validate_before_post
  before update on journal_entries
  for each row execute function validate_journal_balanced();

-- ── 18.4 Reset card spend_mtd monthly ─────────────────────────────────────────
-- Called from pg_cron on the 1st of each month
create or replace function reset_card_monthly_spend()
returns void
language plpgsql
security definer
as $$
begin
  update cards
  set spent_mtd = 0, updated_at = now()
  where status != 'cancelled';
end;
$$;

-- ── 18.5 Invoice total calculation ────────────────────────────────────────────
create or replace function recalculate_invoice_totals()
returns trigger
language plpgsql
as $$
declare
  v_subtotal bigint;
  v_tax_rate numeric(5,2);
  v_tax      bigint;
begin
  select coalesce(sum(amount), 0) into v_subtotal
  from invoice_line_items
  where invoice_id = coalesce(new.invoice_id, old.invoice_id);

  select tax_rate into v_tax_rate
  from invoices
  where id = coalesce(new.invoice_id, old.invoice_id);

  v_tax := floor(v_subtotal * v_tax_rate / 100);

  update invoices set
    subtotal     = v_subtotal,
    tax_amount   = v_tax,
    total_amount = v_subtotal + v_tax,
    updated_at   = now()
  where id = coalesce(new.invoice_id, old.invoice_id);

  return new;
end;
$$;

create trigger invoice_line_change
  after insert or update or delete on invoice_line_items
  for each row execute function recalculate_invoice_totals();

-- ── 18.6 Auto-generate sequential reference numbers ───────────────────────────
create or replace function next_ref_number(
  p_org_id uuid,
  p_prefix text,
  p_table  text
)
returns text
language plpgsql
security definer
as $$
declare
  v_year    text := to_char(now(), 'YYYY');
  v_count   integer;
  v_seq_key text := p_org_id::text || ':' || p_prefix || ':' || v_year;
begin
  -- Upsert a sequence counter in a dedicated table
  insert into ref_sequences (org_id, seq_key, current_val)
  values (p_org_id, v_seq_key, 1)
  on conflict (org_id, seq_key) do update
    set current_val = ref_sequences.current_val + 1
  returning current_val into v_count;

  return p_prefix || '-' || v_year || '-' || lpad(v_count::text, 3, '0');
end;
$$;

-- Sequence counter table (internal use only)
create table ref_sequences (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  seq_key     text not null,
  current_val integer not null default 0,
  unique (org_id, seq_key)
);


-- =============================================================================
-- 19. STORAGE BUCKETS
-- =============================================================================
-- Run via Supabase Dashboard → Storage, or via supabase CLI / management API.
-- The SQL below documents the intended bucket config.

-- Bucket: receipts
--   Path pattern: {org_id}/{expense_id}/receipt.{ext}
--   Access: private — members of the org only
--   Max file size: 20 MB
--   Allowed MIME: image/*, application/pdf

-- Bucket: invoice-pdfs
--   Path pattern: {org_id}/{invoice_id}/invoice.pdf
--   Access: private
--   Max file size: 5 MB

-- Bucket: bill-documents
--   Path pattern: {org_id}/{bill_id}/{filename}
--   Access: private
--   Max file size: 20 MB

-- Bucket: journal-attachments
--   Path pattern: {org_id}/{journal_id}/{filename}
--   Access: private
--   Max file size: 20 MB

-- Bucket: org-logos
--   Path pattern: {org_id}/logo.{ext}
--   Access: public (logo is public-facing)
--   Max file size: 2 MB
--   Allowed MIME: image/*

-- Bucket: member-avatars
--   Path pattern: {user_id}/avatar.{ext}
--   Access: public
--   Max file size: 2 MB
--   Allowed MIME: image/*

-- Storage RLS (set via Supabase Storage policies):
-- SELECT on receipts: is_org_member(bucket_path_extract_org_id)
-- INSERT on receipts: is_org_member(...) AND role in (employee+)
-- All access on invoice-pdfs, bill-documents: finance roles only


-- =============================================================================
-- 20. DEFAULT SEED DATA — SYSTEM TRANSACTION CATEGORIES
-- =============================================================================

insert into transaction_categories (name, emoji, type, is_system, sort_order)
values
  -- Expense categories
  ('Salaries & Wages',   '👥', 'expense', true, 1),
  ('Rent & Utilities',   '🏢', 'expense', true, 2),
  ('Office Supplies',    '🛒', 'expense', true, 3),
  ('Marketing',          '📣', 'expense', true, 4),
  ('Transport',          '🚗', 'expense', true, 5),
  ('Meals & Ent.',       '🍽️', 'expense', true, 6),
  ('Software & SaaS',    '💻', 'expense', true, 7),
  ('Other Expense',      '📦', 'expense', true, 8),
  -- Revenue categories
  ('Sales Revenue',      '💰', 'revenue', true, 9),
  ('Service Income',     '🤝', 'revenue', true, 10),
  ('Consulting Fees',    '💼', 'revenue', true, 11),
  ('Grants & Awards',    '🏆', 'revenue', true, 12),
  ('Interest Income',    '🏦', 'revenue', true, 13),
  ('Rental Income',      '🏠', 'revenue', true, 14),
  ('Other Revenue',      '📥', 'revenue', true, 15);

-- Default SaaS Plans
insert into saas_plans (name, tier, price_monthly_usd_cents, price_annually_usd_cents, max_members, max_transactions_pm, max_cards, has_ai_copilot, has_api_access, has_custom_roles)
values
  ('Free',       'free',       0,       0,      3,  500,    2,  false, false, false),
  ('Starter',    'starter',   4900,   47000,   10,  5000,  10,  false, false, false),
  ('Growth',     'growth',   12900,  124000,   50, 50000,  50,   true,  true, false),
  ('Enterprise', 'enterprise', 0,       0,    null,  null, null,  true,  true,  true);


-- =============================================================================
-- 21. REALTIME SUBSCRIPTIONS (enable for live updates)
-- =============================================================================
-- Run via Supabase Dashboard → Database → Replication
-- Or via: alter publication supabase_realtime add table <table>;

-- Enable realtime on high-frequency tables:
alter publication supabase_realtime add table approval_requests;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table close_checklist_items;
alter publication supabase_realtime add table close_issues;
alter publication supabase_realtime add table bill_inbox;
alter publication supabase_realtime add table card_transactions;
alter publication supabase_realtime add table copilot_messages;


-- =============================================================================
-- 22. INDEXES (performance-critical queries)
-- =============================================================================

-- Full-text search on transactions
create index txns_description_fts
  on transactions using gin(to_tsvector('english', description));

-- Full-text search on invoices
create index invoices_client_fts
  on invoices using gin(to_tsvector('english', client_name));

-- Partial index: unpaid invoices only
create index invoices_unpaid
  on invoices (organization_id, due_date)
  where status not in ('paid', 'void');

-- Partial index: pending approvals only
create index approvals_pending
  on approval_requests (organization_id, assignee_id)
  where decision = 'pending';

-- Partial index: unread notifications
create index notifications_unread
  on notifications (user_id, created_at desc)
  where is_read = false;

-- Monthly aggregation query: transactions by category
create index txns_month_category
  on transactions (organization_id, date_trunc('month', txn_date), category_id)
  where deleted_at is null;

-- Cards over-limit detection
create index cards_over_limit
  on cards (organization_id)
  where spent_mtd > monthly_limit and monthly_limit is not null and status = 'active';

-- Overdue bills
create index bills_overdue
  on bills (organization_id, due_date)
  where status = 'overdue';

-- Revenue by period
create index revenue_period
  on revenue_records (organization_id, period_id, status)
  where deleted_at is null;


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
