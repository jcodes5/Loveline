-- Sprint 10: Memories Albums + Thumbnails + Favorites
-- Add albums table, favorites, and Cloudinary transformations for thumbnails

-- Create albums table
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 500),
  cover_memory_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Add album_id and favorite to memories
alter table public.memories
  add column if not exists album_id uuid references public.albums(id) on delete set null,
  add column if not exists is_favorite boolean not null default false;

-- Add indexes
create index if not exists albums_relationship_created_idx
  on public.albums(relationship_id, created_at desc);

create index if not exists memories_album_idx
  on public.memories(album_id);

create index if not exists memories_favorite_idx
  on public.memories(relationship_id, is_favorite)
  where is_favorite = true;

-- Enable RLS on albums
alter table public.albums enable row level security;

create policy "Members can view albums"
  on public.albums for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

create policy "Owners can create albums"
  on public.albums for insert
  to authenticated
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can update albums"
  on public.albums for update
  to authenticated
  using (public.is_relationship_owner(relationship_id))
  with check (
    public.is_relationship_owner(relationship_id)
    and created_by = auth.uid()
  );

create policy "Owners can delete albums"
  on public.albums for delete
  to authenticated
  using (public.is_relationship_owner(relationship_id));

-- Add foreign key for cover_memory_id after memories has album_id
alter table public.albums
  add constraint fk_cover_memory
  foreign key (cover_memory_id)
  references public.memories(id)
  on delete set null;

-- Grant permissions
grant select on public.albums to authenticated;
grant insert, update, delete on public.albums to authenticated;