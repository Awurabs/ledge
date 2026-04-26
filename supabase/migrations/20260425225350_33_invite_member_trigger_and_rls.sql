-- ── Invite Member: RLS Policies for member_invitations ────────────────────────
-- Only org owners/admins (or platform admins) can read, create, update invitations

-- Drop old policies if any
DROP POLICY IF EXISTS "invitations: admin read"   ON public.member_invitations;
DROP POLICY IF EXISTS "invitations: admin insert" ON public.member_invitations;
DROP POLICY IF EXISTS "invitations: admin update" ON public.member_invitations;
DROP POLICY IF EXISTS "invitations: admin"        ON public.member_invitations;

-- Read: owner/admin can see invitations for their org
CREATE POLICY "invitations: admin read"
  ON public.member_invitations FOR SELECT TO authenticated
  USING (
    my_org_role(organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])
    OR is_platform_admin()
  );

-- Insert: owner/admin can create invitations
CREATE POLICY "invitations: admin insert"
  ON public.member_invitations FOR INSERT TO authenticated
  WITH CHECK (
    my_org_role(organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])
    OR is_platform_admin()
  );

-- Update: owner/admin can update invitations (e.g. revoke)
CREATE POLICY "invitations: admin update"
  ON public.member_invitations FOR UPDATE TO authenticated
  USING (
    my_org_role(organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])
    OR is_platform_admin()
  );

-- All ops (including DELETE) for owner/admin
CREATE POLICY "invitations: admin"
  ON public.member_invitations FOR ALL TO authenticated
  USING (
    my_org_role(organization_id) = ANY (ARRAY['owner'::org_role, 'admin'::org_role])
    OR is_platform_admin()
  );
