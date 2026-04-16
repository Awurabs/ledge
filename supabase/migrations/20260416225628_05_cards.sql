-- cards
create table cards (
  id                   uuid primary key default uuid_generate_v4(),
  organization_id      uuid not null references organizations(id) on delete cascade,
  member_id            uuid not null references organization_members(id),
  bank_account_id      uuid references bank_accounts(id),
  type                 card_type not null default 'virtual',
  status               card_status not null default 'pending_activation',
  card_name            text not null,
  last_four            char(4),
  expiry_month         smallint,
  expiry_year          smallint,
  spending_limit       bigint,
  spending_period      text default 'monthly',
  current_period_spend bigint not null default 0,
  currency             currency_code not null default 'GHS',
  provider_card_id     text,
  color                text default '#6366F1',
  is_virtual           boolean not null default true,
  created_by           uuid references profiles(id),
  activated_at         timestamptz,
  frozen_at            timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index on cards (organization_id);
create index on cards (member_id);
create trigger set_updated_at before update on cards
  for each row execute function public.set_updated_at();
