-- Sprint: One-time Invitation Redemption (security-definer)
-- Lets a claimed recipient atomically:
--   1. validate the token (pending, unexpired, unused, email match)
--   2. mark the invitation accepted + used
--   3. join the relationship as 'recipient'
-- Because both relationship_invitations (owner-select) and
-- relationship_members (owner-manage) are owner-gated by RLS, this runs as
-- security definer to provide the exact, minimal path for a recipient to join.

create or replace function public.redeem_invitation_token(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  claiming_user_id uuid := auth.uid();
  claiming_email text;
  target_invite public.relationship_invitations;
  target_relationship_id uuid;
begin
  if claiming_user_id is null then
    raise exception 'You need to be signed in to accept an invitation.';
  end if;

  if invite_token is null or length(invite_token) < 20 then
    raise exception 'That invitation link does not look right.';
  end if;

  select email into claiming_email
  from auth.users
  where id = claiming_user_id;

  select * into target_invite
  from public.relationship_invitations
  where token = invite_token;

  if target_invite.id is null then
    raise exception 'That invitation was not found.';
  end if;

  if target_invite.status = 'revoked' then
    raise exception 'That invitation was revoked. Ask your partner for a new one.';
  end if;

  if target_invite.used_at is not null or target_invite.status = 'accepted' then
    raise exception 'That invitation has already been used.';
  end if;

  if target_invite.expires_at is not null
     and target_invite.expires_at < timezone('utc', now()) then
    raise exception 'That invitation has expired. Ask your partner for a new one.';
  end if;

  if lower(coalesce(claiming_email, '')) <> lower(target_invite.invitee_email) then
    raise exception 'That invitation belongs to another email address.';
  end if;

  update public.relationship_invitations
  set status = 'accepted',
      used_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id = target_invite.id
    and used_at is null
  returning relationship_id
  into target_relationship_id;

  if target_relationship_id is null then
    -- Someone else claimed it between our check and the update.
    raise exception 'That invitation has already been used.';
  end if;

  insert into public.relationship_members (relationship_id, user_id, role)
  values (target_relationship_id, claiming_user_id, 'recipient')
  on conflict (relationship_id, user_id) do nothing;

  return target_relationship_id;
end;
$$;

revoke all on function public.redeem_invitation_token(text) from public;
grant execute on function public.redeem_invitation_token(text) to authenticated;