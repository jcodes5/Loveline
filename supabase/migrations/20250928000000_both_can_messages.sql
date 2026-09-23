-- Sprint 12b: Both partners can send messages + heart feedback with a short note.
-- 1) A "message" reaction can carry a short note that lands instantly.
alter table public.love_reactions
  add column if not exists note text
  check (note is null or char_length(note) <= 280);

-- 2) Anyone in the relationship can create a quote card, not just the owner.
drop policy if exists "Owners can create quote cards"
  on public.quote_cards;
create policy "Members can create quote cards"
  on public.quote_cards for insert
  to authenticated
  with check (
    public.is_relationship_member(relationship_id)
    and created_by = auth.uid()
  );

-- 3) Anyone can remove a card they sent themselves.
drop policy if exists "Owners can delete quote cards"
  on public.quote_cards;
create policy "Members can remove their own quote cards"
  on public.quote_cards for delete
  to authenticated
  using (
    public.is_relationship_member(relationship_id)
    and created_by = auth.uid()
  );