-- Sprint 11: Message Types + Special Date Attachment
-- Add message_type and special_date_id to personal_messages
-- Also update special_dates to support message attachment

-- Add message_type enum
create type public.personal_message_type as enum (
  'good_morning',
  'good_night',
  'miss_you',
  'proud',
  'encouragement',
  'laugh',
  'random'
);

-- Add message_type and special_date_id to personal_messages
alter table public.personal_messages
  add column if not exists message_type public.personal_message_type default 'random',
  add column if not exists special_date_id uuid references public.special_dates(id) on delete set null;

-- Update special_dates to support message attachment
alter table public.special_dates
  add column if not exists attached_message_id uuid references public.personal_messages(id) on delete set null;

-- Add index for message_type queries
create index if not exists personal_messages_type_idx
  on public.personal_messages(relationship_id, message_type, status, scheduled_for desc);

-- Add index for special_date_id queries
create index if not exists personal_messages_special_date_idx
  on public.personal_messages(relationship_id, special_date_id)
  where special_date_id is not null;

-- Update special_dates with message attachment index
create index if not exists special_dates_attached_message_idx
  on public.special_dates(relationship_id, attached_message_id)
  where attached_message_id is not null;

-- Grant permissions
grant select on public.personal_messages to authenticated;
grant insert, update, delete on public.personal_messages to authenticated;