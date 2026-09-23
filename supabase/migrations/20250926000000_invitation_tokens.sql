-- Sprint: One-time Invitation Links for Lovers
-- Add unique invitation tokens with expiry and one-time use

-- Add unique token and expiry to relationship_invitations
alter table public.relationship_invitations
  add column if not exists token text unique,
  add column if not exists expires_at timestamptz,
  add column if not exists used_at timestamptz;

-- Add index for token lookup
create index if not exists relationship_invitations_token_idx
  on public.relationship_invitations(token)
  where token is not null;

-- Add index for expired invitations cleanup
create index if not exists relationship_invitations_expires_idx
  on public.relationship_invitations(expires_at)
  where expires_at is not null;

-- Update existing invitations to have tokens
update public.relationship_invitations
set token = replace(replace(replace(encode(gen_random_bytes(32), 'base64'), '/', '_'), '+', '-'), '=', ''),
    expires_at = created_at + interval '7 days'
where token is null;

-- Grant permissions
grant select, insert, update on public.relationship_invitations to authenticated;