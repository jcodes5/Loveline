create type public.special_date_kind as enum ('relationship_start', 'anniversary', 'birthday', 'custom');

create table public.special_dates (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind public.special_date_kind not null default 'custom',
  label text not null check (char_length(label) between 1 and 120),
  event_date date not null,
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index special_dates_relationship_start_idx
  on public.special_dates(relationship_id)
  where kind = 'relationship_start';

create index special_dates_relationship_date_idx
  on public.special_dates(relationship_id, event_date);

alter table public.special_dates enable row level security;

create policy "Members can view special dates"
  on public.special_dates for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can create special dates"
  on public.special_dates for insert
  to authenticated
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can update special dates"
  on public.special_dates for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can delete special dates"
  on public.special_dates for delete
  to authenticated
  using (public.is_relationship_owner(relationship_id));
