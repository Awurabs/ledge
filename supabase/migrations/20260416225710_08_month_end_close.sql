-- close_periods
create table close_periods (
  id              uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  period_year     smallint not null,
  period_month    smallint not null,
  status          close_period_status not null default 'open',
  opened_by       uuid references profiles(id),
  closed_by       uuid references profiles(id),
  locked_at       timestamptz,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, period_year, period_month)
);
create index on close_periods (organization_id, period_year, period_month);
create trigger set_updated_at before update on close_periods
  for each row execute function public.set_updated_at();

-- period_checklist_items
create table period_checklist_items (
  id              uuid primary key default uuid_generate_v4(),
  close_period_id uuid not null references close_periods(id) on delete cascade,
  title           text not null,
  description     text,
  status          checklist_item_status not null default 'pending',
  assigned_to     uuid references organization_members(id),
  due_date        date,
  completed_at    timestamptz,
  completed_by    uuid references profiles(id),
  sort_order      smallint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on period_checklist_items (close_period_id);
create trigger set_updated_at before update on period_checklist_items
  for each row execute function public.set_updated_at();
