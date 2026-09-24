alter table public.daily_content
  add column if not exists approval_status text not null default 'approved'
  check (approval_status in ('pending', 'approved', 'rejected'));

create index if not exists daily_content_review_idx
  on public.daily_content(relationship_id, approval_status, content_date desc);

create table if not exists public.personal_message_revisions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references public.personal_messages(id) on delete set null,
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  title text not null,
  body text not null,
  message_type public.personal_message_type not null,
  status public.personal_message_status not null,
  scheduled_for timestamptz,
  published_at timestamptz,
  special_date_id uuid,
  version_updated_at timestamptz not null,
  changed_at timestamptz not null default timezone('utc', now()),
  changed_by uuid references auth.users(id) on delete set null
);

create index if not exists personal_message_revisions_message_idx
  on public.personal_message_revisions(message_id, changed_at desc);

alter table public.personal_message_revisions enable row level security;

create policy "Owners can view personal message revisions"
  on public.personal_message_revisions for select
  to authenticated
  using (public.is_relationship_owner(relationship_id));

grant select on public.personal_message_revisions to authenticated;

create or replace function public.record_personal_message_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
    insert into public.personal_message_revisions (
      message_id,
      relationship_id,
      title,
      body,
      message_type,
      status,
      scheduled_for,
      published_at,
      special_date_id,
      version_updated_at,
      changed_by
    ) values (
      old.id,
      old.relationship_id,
      old.title,
      old.body,
      old.message_type,
      old.status,
      old.scheduled_for,
      old.published_at,
      old.special_date_id,
      old.updated_at,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists personal_messages_record_revision on public.personal_messages;
create trigger personal_messages_record_revision
  before update on public.personal_messages
  for each row execute function public.record_personal_message_revision();
