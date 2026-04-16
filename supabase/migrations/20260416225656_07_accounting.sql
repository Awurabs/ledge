-- chart_of_accounts (organization_id nullable = system/global accounts)
create table chart_of_accounts (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  code            text not null,
  name            text not null,
  type            account_type not null,
  subtype         account_subtype,
  parent_id       uuid references chart_of_accounts(id),
  description     text,
  is_system       boolean not null default false,
  is_active       boolean not null default true,
  is_bank_account boolean not null default false,
  bank_account_id uuid references bank_accounts(id),
  currency        currency_code not null default 'GHS',
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);
create index on chart_of_accounts (organization_id, type);
create trigger set_updated_at before update on chart_of_accounts
  for each row execute function public.set_updated_at();

-- resolve deferred FKs now that chart_of_accounts exists
alter table transaction_categories
  add constraint fk_txn_cat_gl foreign key (gl_account_id) references chart_of_accounts(id);

alter table transactions
  add constraint fk_txn_gl foreign key (gl_account_id) references chart_of_accounts(id);

alter table expenses
  add constraint fk_expense_gl foreign key (gl_account_id) references chart_of_accounts(id);

alter table expense_items
  add constraint fk_expense_item_gl foreign key (gl_account_id) references chart_of_accounts(id);

-- journal_entries
create table journal_entries (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entry_number    text not null,
  description     text not null,
  status          journal_status not null default 'draft',
  entry_date      date not null,
  reference       text,
  source_type     text,
  source_id       uuid,
  currency        currency_code not null default 'GHS',
  total_debit     bigint not null default 0,
  total_credit    bigint not null default 0,
  posted_by       uuid references profiles(id),
  posted_at       timestamptz,
  reversed_by_id  uuid,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, entry_number)
);
create index on journal_entries (organization_id, status);
create index on journal_entries (organization_id, entry_date desc);
create trigger set_updated_at before update on journal_entries
  for each row execute function public.set_updated_at();

-- journal_entry_lines
create table journal_entry_lines (
  id               uuid primary key default uuid_generate_v4(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  line_number      smallint not null,
  account_id       uuid not null references chart_of_accounts(id),
  debit_amount     bigint not null default 0,
  credit_amount    bigint not null default 0,
  description      text,
  created_at       timestamptz not null default now()
);
create index on journal_entry_lines (journal_entry_id);
create index on journal_entry_lines (account_id);

-- resolve deferred FK: transactions.journal_entry_id
alter table transactions
  add constraint fk_txn_journal foreign key (journal_entry_id) references journal_entries(id);

-- resolve deferred FK: expenses.journal_entry_id
alter table expenses
  add constraint fk_expense_journal foreign key (journal_entry_id) references journal_entries(id);
