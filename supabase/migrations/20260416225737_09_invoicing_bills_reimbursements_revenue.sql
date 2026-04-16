-- contacts (customers & vendors for invoices / bills)
create table contacts (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  tax_id          text,
  type            text not null default 'both',
  currency        currency_code not null default 'GHS',
  payment_terms   text default 'Net 30',
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index on contacts (organization_id);
create trigger set_updated_at before update on contacts
  for each row execute function public.set_updated_at();

-- invoices
create table invoices (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_number  text not null,
  contact_id      uuid references contacts(id),
  status          invoice_status not null default 'draft',
  issue_date      date not null,
  due_date        date,
  currency        currency_code not null default 'GHS',
  subtotal        bigint not null default 0,
  tax_amount      bigint not null default 0,
  discount_amount bigint not null default 0,
  total_amount    bigint not null default 0,
  amount_paid     bigint not null default 0,
  amount_due      bigint not null default 0,
  tax_rate        numeric(5,2) not null default 0,
  payment_terms   text,
  notes           text,
  footer          text,
  bank_account_id uuid references bank_accounts(id),
  journal_entry_id uuid references journal_entries(id),
  sent_at         timestamptz,
  paid_at         timestamptz,
  voided_at       timestamptz,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (organization_id, invoice_number)
);
create index on invoices (organization_id, status);
create index on invoices (organization_id, due_date);
create index on invoices (contact_id);
create trigger set_updated_at before update on invoices
  for each row execute function public.set_updated_at();

-- invoice_line_items
create table invoice_line_items (
  id            uuid primary key default uuid_generate_v4(),
  invoice_id    uuid not null references invoices(id) on delete cascade,
  description   text not null,
  quantity      numeric(12,4) not null default 1,
  unit_price    bigint not null,
  line_total    bigint not null,
  tax_rate      numeric(5,2) not null default 0,
  gl_account_id uuid references chart_of_accounts(id),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index on invoice_line_items (invoice_id);

-- invoice_payments
create table invoice_payments (
  id               uuid primary key default uuid_generate_v4(),
  invoice_id       uuid not null references invoices(id),
  bank_account_id  uuid references bank_accounts(id),
  amount           bigint not null,
  currency         currency_code not null default 'GHS',
  payment_date     date not null,
  payment_method   payment_method not null default 'bank_transfer',
  reference        text,
  note             text,
  journal_entry_id uuid references journal_entries(id),
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now()
);
create index on invoice_payments (invoice_id);

-- bills
create table bills (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  bill_number      text,
  contact_id       uuid references contacts(id),
  status           bill_status not null default 'inbox',
  bill_date        date,
  due_date         date,
  currency         currency_code not null default 'GHS',
  subtotal         bigint not null default 0,
  tax_amount       bigint not null default 0,
  total_amount     bigint not null default 0,
  amount_paid      bigint not null default 0,
  amount_due       bigint not null default 0,
  tax_rate         numeric(5,2) not null default 0,
  notes            text,
  attachment_url   text,
  journal_entry_id uuid references journal_entries(id),
  approved_at      timestamptz,
  approved_by      uuid references profiles(id),
  paid_at          timestamptz,
  scheduled_date   date,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index on bills (organization_id, status);
create index on bills (organization_id, due_date);
create index on bills (contact_id);
create trigger set_updated_at before update on bills
  for each row execute function public.set_updated_at();

-- bill_line_items
create table bill_line_items (
  id            uuid primary key default uuid_generate_v4(),
  bill_id       uuid not null references bills(id) on delete cascade,
  description   text not null,
  quantity      numeric(12,4) not null default 1,
  unit_price    bigint not null,
  line_total    bigint not null,
  tax_rate      numeric(5,2) not null default 0,
  gl_account_id uuid references chart_of_accounts(id),
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index on bill_line_items (bill_id);

-- reimbursements
create table reimbursements (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  member_id        uuid not null references organization_members(id),
  title            text not null,
  total_amount     bigint not null,
  currency         currency_code not null default 'GHS',
  status           reimbursement_status not null default 'draft',
  bank_account_id  uuid references bank_accounts(id),
  expense_ids      uuid[] default '{}',
  notes            text,
  submitted_at     timestamptz,
  approved_at      timestamptz,
  approved_by      uuid references profiles(id),
  paid_at          timestamptz,
  journal_entry_id uuid references journal_entries(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on reimbursements (organization_id, status);
create index on reimbursements (member_id);
create trigger set_updated_at before update on reimbursements
  for each row execute function public.set_updated_at();

-- revenue_records
create table revenue_records (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  category_id      uuid references transaction_categories(id),
  description      text not null,
  amount           bigint not null,
  currency         currency_code not null default 'GHS',
  status           revenue_status not null default 'pending',
  revenue_date     date not null,
  bank_account_id  uuid references bank_accounts(id),
  invoice_id       uuid references invoices(id),
  gl_account_id    uuid references chart_of_accounts(id),
  journal_entry_id uuid references journal_entries(id),
  reference        text,
  notes            text,
  created_by       uuid references profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index on revenue_records (organization_id, status);
create index on revenue_records (organization_id, revenue_date desc);
create trigger set_updated_at before update on revenue_records
  for each row execute function public.set_updated_at();
