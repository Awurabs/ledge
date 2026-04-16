-- bank_accounts (integration_id FK added later after integrations table)
create table bank_accounts (
  id                    uuid primary key default uuid_generate_v4(),
  organization_id       uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  slug                  text not null,
  type                  bank_account_type not null default 'bank',
  institution_name      text,
  account_number_masked text,
  account_number_enc    text,
  currency              currency_code not null default 'GHS',
  current_balance       bigint not null default 0,
  is_default            boolean not null default false,
  is_active             boolean not null default true,
  color                 text default '#9CA3AF',
  integration_id        uuid,
  last_synced_at        timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz
);
create index on bank_accounts (organization_id);
create trigger set_updated_at before update on bank_accounts
  for each row execute function public.set_updated_at();

-- transaction_categories (gl_account FK added later after chart_of_accounts)
create table transaction_categories (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name            text not null,
  emoji           text,
  type            txn_type not null,
  gl_account_id   uuid,
  is_system       boolean not null default false,
  is_active       boolean not null default true,
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now()
);
create index on transaction_categories (organization_id);

-- transactions (gl_account + journal_entry FKs added later)
create table transactions (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  bank_account_id  uuid not null references bank_accounts(id),
  reference        text,
  description      text not null,
  direction        txn_direction not null,
  amount           bigint not null,
  currency         currency_code not null default 'GHS',
  status           txn_status not null default 'pending',
  type             txn_type,
  category_id      uuid references transaction_categories(id),
  gl_account_id    uuid,
  journal_entry_id uuid,
  note             text,
  txn_date         date not null,
  posted_date      date,
  posted_by        uuid references profiles(id),
  posted_at        timestamptz,
  source           text,
  external_id      text,
  receipt_url      text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  unique (organization_id, bank_account_id, external_id)
);
create index on transactions (organization_id, status);
create index on transactions (organization_id, txn_date desc);
create index on transactions (bank_account_id);
create index on transactions (category_id);
create trigger set_updated_at before update on transactions
  for each row execute function public.set_updated_at();
