create type public.quote_card_palette as enum ('rose', 'dusk', 'honey');

create table public.quote_cards (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  quote_text text not null check (char_length(quote_text) between 1 and 600),
  quote_author text not null check (char_length(quote_author) between 1 and 160),
  quote_source text check (quote_source is null or char_length(quote_source) <= 160),
  palette public.quote_card_palette not null default 'rose',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index quote_cards_relationship_created_idx
  on public.quote_cards(relationship_id, created_at desc);

alter table public.quote_cards enable row level security;

create policy "Members can view quote cards"
  on public.quote_cards for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can create quote cards"
  on public.quote_cards for insert
  to authenticated
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can update quote cards"
  on public.quote_cards for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can delete quote cards"
  on public.quote_cards for delete
  to authenticated
  using (public.is_relationship_owner(relationship_id));
