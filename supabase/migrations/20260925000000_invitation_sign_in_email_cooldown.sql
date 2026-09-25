-- Sprint: Invitation sign-in email cooldown
-- Records when the sign-in-link email was last sent so the guest invite page
-- can re-send automatically without spamming the recipient on page reloads.
alter table public.relationship_invitations
  add column if not exists sign_in_email_sent_at timestamptz;