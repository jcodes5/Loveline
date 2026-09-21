-- Sprint 8: Mood → Content Mapping
-- Add mood_mappings table for admin-configured mood → content associations

create table public.mood_mappings (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  mood public.mood_entry_value not null,
  message_id uuid references public.personal_messages(id) on delete set null,
  letter_id uuid references public.open_when_letters(id) on delete set null,
  ai_prompt text check (char_length(ai_prompt) <= 2000),
  custom_message text check (char_length(custom_message) <= 4000),
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, mood)
);

create index mood_mappings_relationship_mood_idx
  on public.mood_mappings(relationship_id, mood)
  where enabled = true;

alter table public.mood_mappings enable row level security;

create policy "Members can view mood mappings"
  on public.mood_mappings for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can manage mood mappings"
  on public.mood_mappings for all
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (public.is_relationship_owner(relationship_id));

grant select on public.mood_mappings to authenticated;
grant insert, update, delete on public.mood_mappings to authenticated;