create table public.daily_content (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  content_date date not null,
  hero_label text not null default 'Today, made for you' check (char_length(hero_label) <= 80),
  hero_title text not null check (char_length(hero_title) between 1 and 240),
  hero_body text not null check (char_length(hero_body) between 1 and 1000),
  note_body text not null check (char_length(note_body) between 1 and 2000),
  affirmation text not null check (char_length(affirmation) between 1 and 300),
  affirmation_detail text not null check (char_length(affirmation_detail) between 1 and 600),
  quote_text text not null check (char_length(quote_text) between 1 and 600),
  quote_author text not null check (char_length(quote_author) between 1 and 160),
  quote_source text check (quote_source is null or char_length(quote_source) <= 160),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (relationship_id, content_date)
);

create index daily_content_relationship_date_idx
  on public.daily_content(relationship_id, content_date desc);

alter table public.daily_content enable row level security;

create policy "Members can view daily content"
  on public.daily_content for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can manage daily content"
  on public.daily_content for all
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (public.is_relationship_owner(relationship_id));

grant select, insert, update, delete on public.daily_content to authenticated;
