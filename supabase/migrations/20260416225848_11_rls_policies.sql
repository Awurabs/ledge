-- ============================================================
-- RLS helper functions (security definer → bypass RLS on
-- organization_members to avoid recursive policy evaluation)
-- ============================================================

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and deactivated_at is null
  );
$$;

create or replace function public.my_org_role(org_id uuid)
returns org_role language sql security definer stable as $$
  select role from organization_members
  where organization_id = org_id
    and user_id = auth.uid()
    and deactivated_at is null
  limit 1;
$$;

create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_platform_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================
alter table organizations          enable row level security;
alter table profiles               enable row level security;
alter table saas_plans             enable row level security;
alter table departments            enable row level security;
alter table organization_members   enable row level security;
alter table org_subscriptions      enable row level security;
alter table feature_flags          enable row level security;
alter table platform_audit_logs    enable row level security;
alter table stripe_webhook_events  enable row level security;
alter table organization_settings  enable row level security;
alter table notification_preferences enable row level security;
alter table notifications          enable row level security;
alter table audit_logs             enable row level security;
alter table bank_accounts          enable row level security;
alter table transaction_categories enable row level security;
alter table transactions           enable row level security;
alter table cards                  enable row level security;
alter table expenses               enable row level security;
alter table expense_items          enable row level security;
alter table approval_policies      enable row level security;
alter table approval_steps         enable row level security;
alter table approval_requests      enable row level security;
alter table chart_of_accounts      enable row level security;
alter table journal_entries        enable row level security;
alter table journal_entry_lines    enable row level security;
alter table close_periods          enable row level security;
alter table period_checklist_items enable row level security;
alter table contacts               enable row level security;
alter table invoices               enable row level security;
alter table invoice_line_items     enable row level security;
alter table invoice_payments       enable row level security;
alter table bills                  enable row level security;
alter table bill_line_items        enable row level security;
alter table reimbursements         enable row level security;
alter table revenue_records        enable row level security;
alter table integrations           enable row level security;
alter table copilot_conversations  enable row level security;
alter table analytics_snapshots    enable row level security;
alter table people                 enable row level security;

-- ============================================================
-- organizations
-- ============================================================
create policy "org_members_select" on organizations
  for select using (public.is_org_member(id) or public.is_platform_admin());
create policy "platform_admin_all_orgs" on organizations
  for all using (public.is_platform_admin());

-- ============================================================
-- profiles
-- ============================================================
create policy "own_or_same_org_select" on profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from organization_members om1
      join organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid() and om2.user_id = profiles.id
    )
    or public.is_platform_admin()
  );
create policy "update_own_profile" on profiles
  for update using (id = auth.uid());
create policy "platform_admin_all_profiles" on profiles
  for all using (public.is_platform_admin());

-- ============================================================
-- saas_plans
-- ============================================================
create policy "anyone_view_active_plans" on saas_plans
  for select using (is_active = true or public.is_platform_admin());
create policy "platform_admin_manage_plans" on saas_plans
  for all using (public.is_platform_admin());

-- ============================================================
-- departments
-- ============================================================
create policy "org_member_select_dept" on departments
  for select using (public.is_org_member(organization_id));
create policy "admin_manage_dept" on departments
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));
create policy "platform_admin_dept" on departments
  for all using (public.is_platform_admin());

-- ============================================================
-- organization_members
-- ============================================================
create policy "org_member_select_members" on organization_members
  for select using (public.is_org_member(organization_id));
create policy "admin_manage_members" on organization_members
  for all using (public.my_org_role(organization_id) in ('owner','admin'));
create policy "platform_admin_members" on organization_members
  for all using (public.is_platform_admin());

-- ============================================================
-- org_subscriptions
-- ============================================================
create policy "org_admin_select_sub" on org_subscriptions
  for select using (public.my_org_role(organization_id) in ('owner','admin'));
create policy "platform_admin_sub" on org_subscriptions
  for all using (public.is_platform_admin());

-- ============================================================
-- feature_flags (platform-admin only)
-- ============================================================
create policy "platform_admin_feature_flags" on feature_flags
  for all using (public.is_platform_admin());

-- ============================================================
-- platform_audit_logs (platform-admin only)
-- ============================================================
create policy "platform_admin_audit" on platform_audit_logs
  for all using (public.is_platform_admin());

-- ============================================================
-- stripe_webhook_events (platform-admin only)
-- ============================================================
create policy "platform_admin_stripe_events" on stripe_webhook_events
  for all using (public.is_platform_admin());

-- ============================================================
-- organization_settings
-- ============================================================
create policy "org_member_select_settings" on organization_settings
  for select using (public.is_org_member(organization_id));
create policy "admin_update_settings" on organization_settings
  for update using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));
create policy "platform_admin_settings" on organization_settings
  for all using (public.is_platform_admin());

-- ============================================================
-- notification_preferences
-- ============================================================
create policy "own_notification_prefs" on notification_preferences
  for all using (
    member_id in (
      select id from organization_members where user_id = auth.uid()
    )
  );

-- ============================================================
-- notifications
-- ============================================================
create policy "own_notifications_select" on notifications
  for select using (user_id = auth.uid());
create policy "own_notifications_update" on notifications
  for update using (user_id = auth.uid());
create policy "platform_admin_notifications" on notifications
  for all using (public.is_platform_admin());

-- ============================================================
-- audit_logs
-- ============================================================
create policy "finance_select_audit" on audit_logs
  for select using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or public.is_platform_admin()
  );
create policy "member_insert_audit" on audit_logs
  for insert with check (public.is_org_member(organization_id));

-- ============================================================
-- bank_accounts
-- ============================================================
create policy "org_member_select_bank" on bank_accounts
  for select using (public.is_org_member(organization_id));
create policy "finance_manage_bank" on bank_accounts
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));
create policy "platform_admin_bank" on bank_accounts
  for all using (public.is_platform_admin());

-- ============================================================
-- transaction_categories
-- ============================================================
create policy "member_or_global_select_cat" on transaction_categories
  for select using (
    organization_id is null or public.is_org_member(organization_id)
  );
create policy "admin_manage_cat" on transaction_categories
  for all using (
    organization_id is null
    or public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );

-- ============================================================
-- transactions
-- ============================================================
create policy "org_member_select_txn" on transactions
  for select using (public.is_org_member(organization_id));
create policy "finance_manage_txn" on transactions
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));
create policy "platform_admin_txn" on transactions
  for all using (public.is_platform_admin());

-- ============================================================
-- cards
-- ============================================================
create policy "own_or_admin_card_select" on cards
  for select using (
    public.is_org_member(organization_id) and (
      member_id in (select id from organization_members where user_id = auth.uid())
      or public.my_org_role(organization_id) in ('owner','admin','finance_lead')
    )
  );
create policy "admin_manage_cards" on cards
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));

-- ============================================================
-- expenses
-- ============================================================
create policy "own_or_admin_expense_select" on expenses
  for select using (
    public.is_org_member(organization_id) and (
      submitted_by in (select id from organization_members where user_id = auth.uid())
      or public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    )
  );
create policy "member_insert_expense" on expenses
  for insert with check (public.is_org_member(organization_id));
create policy "own_or_admin_expense_update" on expenses
  for update using (
    submitted_by in (select id from organization_members where user_id = auth.uid())
    or public.my_org_role(organization_id) in ('owner','admin','finance_lead')
  );
create policy "platform_admin_expenses" on expenses
  for all using (public.is_platform_admin());

-- ============================================================
-- expense_items
-- ============================================================
create policy "via_expense_select_items" on expense_items
  for select using (
    expense_id in (
      select id from expenses where public.is_org_member(organization_id)
    )
  );

-- ============================================================
-- approval_policies
-- ============================================================
create policy "org_member_select_policy" on approval_policies
  for select using (public.is_org_member(organization_id));
create policy "admin_manage_policy" on approval_policies
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));

-- ============================================================
-- approval_steps
-- ============================================================
create policy "via_policy_select_steps" on approval_steps
  for select using (
    policy_id in (
      select id from approval_policies where public.is_org_member(organization_id)
    )
  );

-- ============================================================
-- approval_requests
-- ============================================================
create policy "org_member_select_approval" on approval_requests
  for select using (public.is_org_member(organization_id));
create policy "system_insert_approval" on approval_requests
  for insert with check (public.is_org_member(organization_id));
create policy "approver_decide" on approval_requests
  for update using (
    approver_id in (select id from organization_members where user_id = auth.uid())
    or public.my_org_role(organization_id) in ('owner','admin','finance_lead')
  );

-- ============================================================
-- chart_of_accounts
-- ============================================================
create policy "member_or_global_select_coa" on chart_of_accounts
  for select using (
    organization_id is null or public.is_org_member(organization_id)
  );
create policy "accountant_manage_coa" on chart_of_accounts
  for all using (
    organization_id is null
    or public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );

-- ============================================================
-- journal_entries
-- ============================================================
create policy "accountant_select_je" on journal_entries
  for select using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or public.is_platform_admin()
  );
create policy "accountant_insert_je" on journal_entries
  for insert with check (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );
create policy "accountant_update_je" on journal_entries
  for update using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );

-- ============================================================
-- journal_entry_lines
-- ============================================================
create policy "via_journal_select_lines" on journal_entry_lines
  for select using (
    journal_entry_id in (
      select id from journal_entries
      where public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    )
  );
create policy "accountant_insert_lines" on journal_entry_lines
  for insert with check (
    journal_entry_id in (
      select id from journal_entries
      where public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    )
  );

-- ============================================================
-- close_periods
-- ============================================================
create policy "accountant_select_period" on close_periods
  for select using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );
create policy "admin_manage_period" on close_periods
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));

-- ============================================================
-- period_checklist_items
-- ============================================================
create policy "via_period_select_checklist" on period_checklist_items
  for select using (
    close_period_id in (
      select id from close_periods where public.is_org_member(organization_id)
    )
  );
create policy "assigned_update_checklist" on period_checklist_items
  for update using (
    assigned_to in (select id from organization_members where user_id = auth.uid())
    or close_period_id in (
      select id from close_periods
      where public.my_org_role(organization_id) in ('owner','admin','finance_lead')
    )
  );

-- ============================================================
-- contacts
-- ============================================================
create policy "org_member_select_contacts" on contacts
  for select using (public.is_org_member(organization_id));
create policy "finance_manage_contacts" on contacts
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));

-- ============================================================
-- invoices
-- ============================================================
create policy "org_member_select_inv" on invoices
  for select using (public.is_org_member(organization_id));
create policy "finance_manage_inv" on invoices
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));

-- ============================================================
-- invoice_line_items
-- ============================================================
create policy "via_invoice_select_lines" on invoice_line_items
  for select using (
    invoice_id in (
      select id from invoices where public.is_org_member(organization_id)
    )
  );

-- ============================================================
-- invoice_payments
-- ============================================================
create policy "via_invoice_select_payments" on invoice_payments
  for select using (
    invoice_id in (
      select id from invoices where public.is_org_member(organization_id)
    )
  );
create policy "finance_insert_inv_payment" on invoice_payments
  for insert with check (
    invoice_id in (
      select id from invoices
      where public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    )
  );

-- ============================================================
-- bills
-- ============================================================
create policy "org_member_select_bills" on bills
  for select using (public.is_org_member(organization_id));
create policy "finance_manage_bills" on bills
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));

-- ============================================================
-- bill_line_items
-- ============================================================
create policy "via_bill_select_lines" on bill_line_items
  for select using (
    bill_id in (
      select id from bills where public.is_org_member(organization_id)
    )
  );

-- ============================================================
-- reimbursements
-- ============================================================
create policy "own_or_admin_reimb_select" on reimbursements
  for select using (
    member_id in (select id from organization_members where user_id = auth.uid())
    or public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );
create policy "own_insert_reimb" on reimbursements
  for insert with check (
    member_id in (select id from organization_members where user_id = auth.uid())
  );
create policy "admin_update_reimb" on reimbursements
  for update using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));

-- ============================================================
-- revenue_records
-- ============================================================
create policy "finance_select_revenue" on revenue_records
  for select using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
    or public.is_platform_admin()
  );
create policy "finance_manage_revenue" on revenue_records
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant'));

-- ============================================================
-- integrations
-- ============================================================
create policy "admin_select_integrations" on integrations
  for select using (public.my_org_role(organization_id) in ('owner','admin'));
create policy "admin_manage_integrations" on integrations
  for all using (public.my_org_role(organization_id) in ('owner','admin'));
create policy "platform_admin_integrations" on integrations
  for all using (public.is_platform_admin());

-- ============================================================
-- copilot_conversations
-- ============================================================
create policy "own_copilot_conversations" on copilot_conversations
  for all using (
    user_id = auth.uid() and public.is_org_member(organization_id)
  );

-- ============================================================
-- analytics_snapshots
-- ============================================================
create policy "finance_select_analytics" on analytics_snapshots
  for select using (
    public.my_org_role(organization_id) in ('owner','admin','finance_lead','accountant')
  );
create policy "platform_admin_analytics" on analytics_snapshots
  for all using (public.is_platform_admin());

-- ============================================================
-- people
-- ============================================================
create policy "org_member_select_people" on people
  for select using (public.is_org_member(organization_id));
create policy "admin_manage_people" on people
  for all using (public.my_org_role(organization_id) in ('owner','admin','finance_lead'));
create policy "platform_admin_people" on people
  for all using (public.is_platform_admin());
