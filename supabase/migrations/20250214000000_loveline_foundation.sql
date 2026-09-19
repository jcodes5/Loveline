create extension if not exists pgcrypto;

create type public.relationship_role as enum ('owner', 'recipient');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.relationship_members (
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.relationship_role not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (relationship_id, user_id)
);

create function public.add_relationship_owner_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.relationship_members (relationship_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_relationship_created
  after insert on public.relationships
  for each row execute procedure public.add_relationship_owner_member();

create table public.relationship_invitations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  inviter_id uuid not null references auth.users(id) on delete cascade,
  invitee_email text not null check (char_length(invitee_email) between 3 and 320),
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index relationships_owner_id_idx on public.relationships(owner_id);
create index relationship_members_user_id_idx on public.relationship_members(user_id);
create index relationship_invitations_relationship_id_idx on public.relationship_invitations(relationship_id);
create unique index pending_relationship_invitation_idx
  on public.relationship_invitations (relationship_id, lower(invitee_email))
  where status = 'pending';

create function public.is_relationship_member(target_relationship_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.relationship_members
    where relationship_id = target_relationship_id
      and user_id = auth.uid()
  );
$$;

create function public.is_relationship_owner(target_relationship_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.relationships
    where id = target_relationship_id
      and owner_id = auth.uid()
  );
$$;

alter table public.profiles enable row level security;
alter table public.relationships enable row level security;
alter table public.relationship_members enable row level security;
alter table public.relationship_invitations enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Members can view their relationship"
  on public.relationships for select
  to authenticated
  using (public.is_relationship_member(id));

create policy "Users can create their own relationship"
  on public.relationships for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their relationship"
  on public.relationships for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can delete their relationship"
  on public.relationships for delete
  to authenticated
  using (owner_id = auth.uid());

create policy "Members can view relationship members"
  on public.relationship_members for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can manage relationship members"
  on public.relationship_members for all
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (public.is_relationship_owner(relationship_id));

create policy "Owners can view invitations"
  on public.relationship_invitations for select
  to authenticated
  using (public.is_relationship_owner(relationship_id));

create policy "Owners can create invitations"
  on public.relationship_invitations for insert
  to authenticated
  with check (
    inviter_id = auth.uid()
    and public.is_relationship_owner(relationship_id)
  );

create policy "Owners can update invitations"
  on public.relationship_invitations for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (public.is_relationship_owner(relationship_id));

grant usage on schema public to anon, authenticated;
grant all on public.profiles to anon, authenticated;
grant all on public.relationships to anon, authenticated;
grant all on public.relationship_members to anon, authenticated;
grant all on public.relationship_invitations to anon, authenticated;
