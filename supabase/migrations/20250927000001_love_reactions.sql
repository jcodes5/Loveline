-- Sprint 12: Love reactions (real-time affection alerts)
-- Table + RLS + realtime publication for the quote-card "send to partner" flow.

create table if not exists public.love_reactions (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.quote_cards(id) on delete set null,
  kind text not null default 'love',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists love_reactions_relationship_created_idx
  on public.love_reactions(relationship_id, created_at desc);

alter table public.love_reactions enable row level security;

drop policy if exists "Members can view love reactions"
  on public.love_reactions;
create policy "Members can view love reactions"
  on public.love_reactions for select
  to authenticated
  using (public.is_relationship_member(relationship_id));

drop policy if exists "Members can send love reactions"
  on public.love_reactions;
create policy "Members can send love reactions"
  on public.love_reactions for insert
  to authenticated
  with check (public.is_relationship_member(relationship_id) and sender_id = auth.uid());

grant select, insert on public.love_reactions to authenticated;

-- Enable realtime for live partner sync (verify in Dashboard → Database → Realtime).
do $$
begin
  if exists (select 1 from pg_publication_tables
             where pubname = 'supabase_realtime'
               and schemaname = 'public'
               and tablename = 'love_reactions') then
    raise notice 'love_reactions is already in supabase_realtime';
  elsif exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.love_reactions;
  end if;
end $$;