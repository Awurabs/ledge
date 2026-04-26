-- ── Subscription Plans: Paystack + dedicated_accountants ──────────────────────
-- Add Paystack reference field to org_subscriptions for Ghana/Africa billing
ALTER TABLE public.org_subscriptions
  ADD COLUMN IF NOT EXISTS paystack_reference text;

-- Add dedicated_accountants count to saas_plans
ALTER TABLE public.saas_plans
  ADD COLUMN IF NOT EXISTS dedicated_accountants integer NOT NULL DEFAULT 0;

-- Update plans with dedicated accountant counts
UPDATE public.saas_plans SET dedicated_accountants = 0 WHERE tier = 'free';
UPDATE public.saas_plans SET dedicated_accountants = 1 WHERE tier = 'starter';
UPDATE public.saas_plans SET dedicated_accountants = 2 WHERE tier = 'growth';
UPDATE public.saas_plans SET dedicated_accountants = 3 WHERE tier = 'enterprise';
