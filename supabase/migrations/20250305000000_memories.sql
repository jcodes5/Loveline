create table public.memories (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  public_id text not null unique check (char_length(public_id) between 1 and 512),
  resource_type text not null default 'image' check (resource_type = 'image'),
  format text not null check (char_length(format) between 1 and 20),
  width integer not null check (width > 0 and width <= 20000),
  height integer not null check (height > 0 and height <= 20000),
  bytes integer not null check (bytes > 0 and bytes <= 7340032),
  caption text not null default '' check (char_length(caption) <= 240),
  taken_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index memories_relationship_created_idx
  on public.memories(relationship_id, created_at desc);

create index memories_relationship_taken_idx
  on public.memories(relationship_id, taken_at desc nulls last);

alter table public.memories enable row level security;

create policy "Members can view memories"
  on public.memories for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can create memories"
  on public.memories for insert
  to authenticated
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can update memories"
  on public.memories for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can delete memories"
  on public.memories for delete
  to authenticated
  using (public.is_relationship_owner(relationship_id));

grant select, insert, update, delete on public.memories to authenticated;
