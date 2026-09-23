create table public.notification_devices (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null check (char_length(token) between 1 and 4096),
  platform text not null default 'web' check (platform = 'web'),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, user_id, token)
);

create index notification_devices_relationship_user_idx
  on public.notification_devices(relationship_id, user_id)
  where enabled = true;

create table public.personal_message_deliveries (
  personal_message_id uuid not null references public.personal_messages(id) on delete cascade,
  notification_device_id uuid not null references public.notification_devices(id) on delete cascade,
  delivered_at timestamptz not null default timezone('utc', now()),
  primary key (personal_message_id, notification_device_id)
);

alter table public.notification_devices enable row level security;
alter table public.personal_message_deliveries enable row level security;

create policy "Users can manage their notification devices"
  on public.notification_devices for all
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id))
  with check (user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "Owners can view message deliveries"
  on public.personal_message_deliveries for select
  to authenticated
  using (
    exists (
      select 1
      from public.personal_messages
      where personal_messages.id = personal_message_deliveries.personal_message_id
        and public.is_relationship_owner(personal_messages.relationship_id)
    )
  );

create policy "Service role can manage message deliveries"
  on public.personal_message_deliveries for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update, delete on public.notification_devices to authenticated;
