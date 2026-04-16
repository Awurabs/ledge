-- organizations
create table organizations (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  slug              text not null unique,
  logo_url          text,
  website           text,
  industry          text,
  country_code      char(2) not null default 'GH',
  base_currency     currency_code not null default 'GHS',
  tin               text,
  timezone          text not null default 'Africa/Accra',
  fiscal_year_start smallint not null default 1,
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
  for each row execute function public.set_updated_at();

-- profiles (extends auth.users)
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  avatar_url        text,
  phone             text,
  job_title         text,
  is_platform_admin boolean not null default false,
  last_seen_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger set_updated_at before update on profiles
  for each row execute function public.set_updated_at();

-- saas_plans
create table saas_plans (
  id                       uuid primary key default uuid_generate_v4(),
  name                     text not null,
  tier                     subscription_tier not null unique,
  price_monthly_usd_cents  integer not null default 0,
  price_annually_usd_cents integer not null default 0,
  max_members              integer,
  max_transactions_pm      integer,
  max_cards                integer,
  has_ai_copilot           boolean not null default false,
  has_api_access           boolean not null default false,
  has_custom_roles         boolean not null default false,
  stripe_monthly_price_id  text,
  stripe_annual_price_id   text,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);

-- departments (manager_id FK added after organization_members)
create table departments (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text,
  budget_amount   bigint default 0,
  currency        currency_code not null default 'GHS',
  manager_id      uuid,
  parent_id       uuid references departments(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, code)
);
create index on departments (organization_id);
create trigger set_updated_at before update on departments
  for each row execute function public.set_updated_at();

-- organization_members
create table organization_members (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  role            org_role not null default 'employee',
  department_id   uuid references departments(id),
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
  for each row execute function public.set_updated_at();

-- resolve circular dep: departments.manager_id → organization_members
alter table departments
  add constraint fk_dept_manager foreign key (manager_id) references organization_members(id);

-- org_subscriptions
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
  for each row execute function public.set_updated_at();

-- feature_flags
create table feature_flags (
  id               uuid primary key default uuid_generate_v4(),
  key              text not null unique,
  description      text,
  enabled_global   boolean not null default false,
  enabled_for_orgs uuid[] default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger set_updated_at before update on feature_flags
  for each row execute function public.set_updated_at();

-- platform_audit_logs
create table platform_audit_logs (
  id             uuid primary key default uuid_generate_v4(),
  actor_id       uuid references profiles(id),
  action         platform_audit_action not null,
  target_org_id  uuid references organizations(id),
  target_user_id uuid references profiles(id),
  metadata       jsonb default '{}',
  ip_address     inet,
  user_agent     text,
  created_at     timestamptz not null default now()
);
create index on platform_audit_logs (actor_id);
create index on platform_audit_logs (target_org_id);
create index on platform_audit_logs (created_at desc);

-- stripe_webhook_events
create table stripe_webhook_events (
  id              uuid primary key default uuid_generate_v4(),
  stripe_event_id text not null unique,
  event_type      text not null,
  api_version     text,
  payload         jsonb not null,
  processed       boolean not null default false,
  processed_at    timestamptz,
  error           text,
  created_at      timestamptz not null default now()
);
create index on stripe_webhook_events (stripe_event_id);
create index on stripe_webhook_events (processed) where processed = false;
