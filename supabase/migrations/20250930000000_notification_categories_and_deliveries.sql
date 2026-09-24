alter table public.notification_preferences
  add column if not exists morning_enabled boolean not null default true,
  add column if not exists morning_time time not null default time '08:00',
  add column if not exists night_enabled boolean not null default true,
  add column if not exists night_time time not null default time '21:00',
  add column if not exists special_dates_enabled boolean not null default true,
  add column if not exists special_dates_time time not null default time '09:00';

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_device_id uuid not null references public.notification_devices(id) on delete cascade,
  delivery_key text not null check (char_length(delivery_key) between 1 and 240),
  category text not null check (category in ('morning', 'night', 'special_date')),
  delivered_at timestamptz not null default timezone('utc', now()),
  unique (notification_device_id, delivery_key)
);

create index if not exists notification_deliveries_relationship_idx
  on public.notification_deliveries(relationship_id, delivered_at desc);

alter table public.notification_deliveries enable row level security;

create policy "Users can view their notification deliveries"
  on public.notification_deliveries for select
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "Service role can manage notification deliveries"
  on public.notification_deliveries for all
  to service_role
  using (true)
  with check (true);

grant select on public.notification_deliveries to authenticated;
grant all on public.notification_deliveries to service_role;
