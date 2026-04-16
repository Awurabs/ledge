create table organization_settings (
  id                          uuid primary key default uuid_generate_v4(),
  organization_id             uuid not null unique references organizations(id) on delete cascade,
  revenue_recognition_method  text not null default 'accrual',
  default_tax_rate            numeric(5,2) not null default 0,
  default_payment_terms       text not null default 'Net 30',
  expense_approval_threshold  bigint default 50000,
  card_txn_approval_threshold bigint default 200000,
  require_receipts_above      bigint default 10000,
  notify_on_new_bill          boolean not null default true,
  notify_on_approval_needed   boolean not null default true,
  notify_on_overdue_invoice   boolean not null default true,
  invoice_logo_url            text,
  invoice_color_hex           char(7) default '#22C55E',
  invoice_footer_text         text,
  ghana_dpa_consent_required  boolean not null default true,
  data_retention_years        smallint not null default 7,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create trigger set_updated_at before update on organization_settings
  for each row execute function public.set_updated_at();

create table notification_preferences (
  id          uuid primary key default uuid_generate_v4(),
  member_id   uuid not null references organization_members(id) on delete cascade,
  event_type  text not null,
  channels    notification_channel[] not null default '{in_app}',
  is_enabled  boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (member_id, event_type)
);
create index on notification_preferences (member_id);

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
