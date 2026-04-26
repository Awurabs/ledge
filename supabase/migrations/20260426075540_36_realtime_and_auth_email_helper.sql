-- ── Real-time Publications + Auth Email Helper ────────────────────────────────
-- Enable real-time change events for People page live updates
-- Add get_user_id_by_email() helper for the revoke-invitation Edge Function

-- ── 1. Real-time publications ────────────────────────────────────────────────
-- Allows Supabase Realtime to broadcast changes on these tables so the
-- People & Teams page updates instantly when invitations are accepted/revoked.
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.member_invitations;

-- ── 2. get_user_id_by_email() ────────────────────────────────────────────────
-- Used by the revoke-invitation Edge Function (running as service_role) to
-- look up the auth.users.id for an invited email address so it can delete
-- the auth user if they haven't logged in yet.
-- Restricted to service_role only — no direct client access.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = p_email LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
