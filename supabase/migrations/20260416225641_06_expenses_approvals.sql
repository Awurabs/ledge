-- expenses (gl_account_id FK added after chart_of_accounts in migration 07)
create table expenses (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  submitted_by    uuid not null references organization_members(id),
  department_id   uuid references departments(id),
  title           text not null,
  description     text,
  total_amount    bigint not null,
  currency        currency_code not null default 'GHS',
  status          expense_status not null default 'draft',
  category_id     uuid references transaction_categories(id),
  policy_id       uuid,
  receipt_urls    text[] default '{}',
  notes           text,
  reimbursable    boolean not null default false,
  card_id         uuid references cards(id),
  transaction_id  uuid references transactions(id),
  submitted_at    timestamptz,
  approved_at     timestamptz,
  rejected_at     timestamptz,
  rejected_reason text,
  paid_at         timestamptz,
  expense_date    date not null,
  gl_account_id   uuid,
  journal_entry_id uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on expenses (organization_id, status);
create index on expenses (submitted_by);
create index on expenses (department_id);
create trigger set_updated_at before update on expenses
  for each row execute function public.set_updated_at();

-- expense_items
create table expense_items (
  id          uuid primary key default uuid_generate_v4(),
  expense_id  uuid not null references expenses(id) on delete cascade,
  description text not null,
  amount      bigint not null,
  currency    currency_code not null default 'GHS',
  category_id uuid references transaction_categories(id),
  gl_account_id uuid,
  receipt_url text,
  created_at  timestamptz not null default now()
);
create index on expense_items (expense_id);

-- approval_policies
create table approval_policies (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  entity_type     text not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on approval_policies (organization_id);
create trigger set_updated_at before update on approval_policies
  for each row execute function public.set_updated_at();

-- approval_steps
create table approval_steps (
  id           uuid primary key default uuid_generate_v4(),
  policy_id    uuid not null references approval_policies(id) on delete cascade,
  step_order   smallint not null,
  approver_id  uuid references organization_members(id),
  approver_role org_role,
  min_amount   bigint,
  max_amount   bigint,
  created_at   timestamptz not null default now()
);
create index on approval_steps (policy_id);

-- approval_requests
create table approval_requests (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type     text not null,
  entity_id       uuid not null,
  policy_id       uuid references approval_policies(id),
  step_order      smallint not null default 1,
  approver_id     uuid references organization_members(id),
  decision        approval_decision not null default 'pending',
  comment         text,
  decided_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on approval_requests (organization_id, entity_type, entity_id);
create index on approval_requests (approver_id, decision);
create trigger set_updated_at before update on approval_requests
  for each row execute function public.set_updated_at();
