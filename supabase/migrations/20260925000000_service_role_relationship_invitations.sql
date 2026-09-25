-- Sprint: Service-role access for invitation links
-- The sign-in-link endpoint resolves invitations with the service-role key,
-- which needs explicit SELECT/UPDATE access plus RLS policies (matching the
-- notification tables pattern). relationship_invitations was only ever
-- granted to anon/authenticated.
grant select, update on public.relationship_invitations to service_role;

create policy "Service role can read invitations"
  on public.relationship_invitations for select
  to service_role
  using (true);

create policy "Service role can update invitations"
  on public.relationship_invitations for update
  to service_role
  using (true)
  with check (true);