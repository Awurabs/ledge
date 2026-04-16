-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- updated_at utility function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- Enums
create type org_role as enum ('owner','admin','finance_lead','accountant','employee','viewer');
create type subscription_tier as enum ('free','starter','growth','enterprise');
create type subscription_status as enum ('trialing','active','past_due','cancelled','paused');
create type bank_account_type as enum ('bank','mobile_money','cash','crypto');
create type txn_direction as enum ('credit','debit');
create type txn_status as enum ('pending','categorized','posted');
create type txn_type as enum ('revenue','expense');
create type card_type as enum ('virtual','physical');
create type card_status as enum ('active','frozen','cancelled','pending_activation');
create type expense_status as enum ('draft','submitted','approved','rejected','reimbursed');
create type approval_decision as enum ('pending','approved','rejected','escalated');
create type account_type as enum ('asset','liability','equity','revenue','expense');
create type account_subtype as enum ('current_asset','fixed_asset','other_asset','current_liability','long_term_liability','equity','operating_revenue','other_revenue','cost_of_goods_sold','operating_expense','other_expense');
create type journal_status as enum ('draft','posted','reversed');
create type invoice_status as enum ('draft','sent','overdue','paid','void','partially_paid');
create type bill_status as enum ('inbox','pending','scheduled','paid','overdue','void');
create type reimbursement_status as enum ('draft','submitted','approved','paid','rejected');
create type revenue_status as enum ('received','pending','partial');
create type close_period_status as enum ('open','in_progress','locked');
create type checklist_item_status as enum ('pending','in_progress','completed','flagged');
create type payment_method as enum ('bank_transfer','mobile_money','cash','pos_card','cheque');
create type currency_code as enum ('GHS','NGN','KES','ZAR','USD','GBP','EUR');
create type notification_channel as enum ('in_app','email','sms','push');
create type integration_provider as enum ('quickbooks','xero','sage','zoho_books','stripe','paystack','flutterwave','mtn_momo','airtel_money','ecobank_api','gcb_api','sendgrid','mailchimp','slack','microsoft_teams','google_drive','dropbox','hubspot','salesforce');
create type integration_status as enum ('connected','disconnected','error','pending_auth');
create type sync_status as enum ('success','partial','failed','running');
create type audit_action as enum ('create','update','delete','view','approve','reject','post','reverse','freeze','unfreeze','cancel','login','logout','invite','remove_member','export','import','connect','disconnect');
create type platform_audit_action as enum ('org_created','org_suspended','org_reinstated','org_deleted','plan_changed','invoice_issued','refund_issued','admin_login','impersonate_start','impersonate_end','feature_flag_updated','broadcast_sent');
