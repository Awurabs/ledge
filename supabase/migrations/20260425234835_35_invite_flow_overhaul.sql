-- ── Invite Flow Overhaul ───────────────────────────────────────────────────────
-- 1. Slim down handle_new_user: only create profile, NOT org membership
--    (org membership is now created when the invited user accepts & sets password)
-- 2. Add accept_my_invitation() RPC: called from ResetPassword page after user
--    sets their password; creates the org membership and marks invitation accepted.

-- ── 1. Updated handle_new_user ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ── 2. accept_my_invitation() ────────────────────────────────────────────────
-- Called by the invited user immediately after they set their password.
-- Finds their pending invitation by email, creates the org membership, and
-- marks the invitation as accepted.
CREATE OR REPLACE FUNCTION public.accept_my_invitation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.member_invitations%ROWTYPE;
BEGIN
  -- Find the most recent valid pending invitation for the current user's email
  SELECT * INTO v_invite
  FROM public.member_invitations
  WHERE email        = auth.email()
    AND accepted_at  IS NULL
    AND revoked_at   IS NULL
    AND expires_at   > now()
  ORDER BY created_at DESC
  LIMIT 1;

  -- No valid invitation found — do nothing (idempotent)
  IF v_invite.id IS NULL THEN
    RETURN;
  END IF;

  -- Create (or reactivate) org membership
  INSERT INTO public.organization_members (
    organization_id, user_id, role, department_id, invited_by, accepted_at
  )
  VALUES (
    v_invite.organization_id,
    auth.uid(),
    v_invite.role,
    v_invite.department_id,
    v_invite.invited_by,
    now()
  )
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET accepted_at    = now(),
        deactivated_at = NULL;

  -- Mark the invitation as accepted
  UPDATE public.member_invitations
  SET accepted_at = now()
  WHERE id = v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_my_invitation() TO authenticated;
