create type public.mood_entry_value as enum ('joyful', 'soft', 'steady', 'tender', 'heavy');

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mood public.mood_entry_value not null,
  entry_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, user_id, entry_date)
);

create index mood_entries_user_date_idx
  on public.mood_entries(user_id, relationship_id, entry_date desc);

alter table public.mood_entries enable row level security;

create policy "Users can view their own mood entries"
  on public.mood_entries for select
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "Users can create their own mood entries"
  on public.mood_entries for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "Users can update their own mood entries"
  on public.mood_entries for update
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id))
  with check (user_id = auth.uid() and public.is_relationship_member(relationship_id));

create policy "Users can delete their own mood entries"
  on public.mood_entries for delete
  to authenticated
  using (user_id = auth.uid() and public.is_relationship_member(relationship_id));

grant select, insert, update, delete on public.mood_entries to authenticated;
