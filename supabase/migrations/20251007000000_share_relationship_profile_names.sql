create policy "Members can view profiles in their relationship"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.relationship_members profile_member
      join public.relationship_members viewer_member
        on viewer_member.relationship_id = profile_member.relationship_id
      where profile_member.user_id = profiles.id
        and viewer_member.user_id = auth.uid()
    )
  );
