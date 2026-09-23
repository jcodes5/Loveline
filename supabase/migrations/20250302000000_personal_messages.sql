create type public.personal_message_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.personal_message_type as enum ('good_morning', 'good_night', 'miss_you', 'proud', 'encouragement', 'laugh', 'random');

create table public.personal_messages (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  message_type public.personal_message_type not null default 'random',
  status public.personal_message_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  special_date_id uuid references public.special_dates(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index personal_messages_relationship_status_idx
  on public.personal_messages(relationship_id, status, scheduled_for desc);

create index personal_messages_author_idx
  on public.personal_messages(author_id, created_at desc);

create index personal_messages_type_idx
  on public.personal_messages(relationship_id, message_type, status, scheduled_for desc);

create index personal_messages_special_date_idx
  on public.personal_messages(relationship_id, special_date_id)
  where special_date_id is not null;

alter table public.personal_messages enable row level security;

create policy "Owners can manage personal messages"
  on public.personal_messages for all
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and author_id = auth.uid()
  );

create policy "Recipients can view deliverable personal messages"
  on public.personal_messages for select
  to authenticated
  using (
    public.is_relationship_member(relationship_id)
    and (
      (
        status = 'published'
        and published_at is not null
        and (scheduled_for is null or scheduled_for <= timezone('utc', now()))
      )
      or (
        status = 'scheduled'
        and scheduled_for is not null
        and scheduled_for <= timezone('utc', now())
      )
    )
  );
