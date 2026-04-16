-- integrations
create table integrations (
  id               uuid primary key default uuid_generate_v4(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  provider         integration_provider not null,
  status           integration_status not null default 'disconnected',
  display_name     text,
  credentials_enc  text,
  metadata         jsonb default '{}',
  webhook_secret   text,
  last_sync_at     timestamptz,
  last_sync_status sync_status,
  error_message    text,
  connected_by     uuid references profiles(id),
  connected_at     timestamptz,
  disconnected_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, provider)
);
create index on integrations (organization_id);
create trigger set_updated_at before update on integrations
  for each row execute function public.set_updated_at();

-- resolve deferred FK: bank_accounts.integration_id → integrations
alter table bank_accounts
  add constraint fk_bank_integration foreign key (integration_id) references integrations(id);

-- copilot_conversations
create table copilot_conversations (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id),
  title           text,
  messages        jsonb not null default '[]',
  context         jsonb default '{}',
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on copilot_conversations (organization_id, user_id);
create trigger set_updated_at before update on copilot_conversations
  for each row execute function public.set_updated_at();

-- analytics_snapshots
create table analytics_snapshots (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  snapshot_date   date not null,
  period          text not null default 'monthly',
  metrics         jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  unique (organization_id, snapshot_date, period)
);
create index on analytics_snapshots (organization_id, snapshot_date desc);

-- people (HR / team directory)
create table people (
  id                      uuid primary key default uuid_generate_v4(),
  organization_id         uuid not null references organizations(id) on delete cascade,
  member_id               uuid references organization_members(id),
  first_name              text not null,
  last_name               text not null,
  email                   text,
  phone                   text,
  job_title               text,
  department_id           uuid references departments(id),
  employment_type         text default 'full_time',
  start_date              date,
  end_date                date,
  salary_amount           bigint,
  salary_currency         currency_code not null default 'GHS',
  bank_name               text,
  bank_account_number_enc text,
  is_active               boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index on people (organization_id);
create index on people (department_id);
create trigger set_updated_at before update on people
  for each row execute function public.set_updated_at();
