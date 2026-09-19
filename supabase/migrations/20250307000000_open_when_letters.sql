create table public.open_when_letters (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  occasion text not null check (char_length(occasion) between 1 and 80),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, occasion)
);

create index open_when_letters_relationship_created_idx
  on public.open_when_letters(relationship_id, created_at desc);

alter table public.open_when_letters enable row level security;

create policy "Members can view Open When letters"
  on public.open_when_letters for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can create Open When letters"
  on public.open_when_letters for insert
  to authenticated
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can update Open When letters"
  on public.open_when_letters for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can delete Open When letters"
  on public.open_when_letters for delete
  to authenticated
  using (public.is_relationship_owner(relationship_id));
