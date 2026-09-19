create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  personal_messages_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, user_id)
);

create index notification_preferences_user_idx
  on public.notification_preferences(user_id, relationship_id);

alter table public.notification_preferences enable row level security;

create policy "Users can manage their notification preferences"
  on public.notification_preferences for all
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id))
  with check (user_id = auth.uid() and public.is_relationship_member(relationship_id));
