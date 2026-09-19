-- Fix RLS policy on relationships to allow owners to view their own relationships
-- This ensures the owner can immediately fetch their relationship after creation

-- Add policy for owners to view their relationships
create policy "Owners can view their own relationships"
  on public.relationships for select
  to authenticated
  using (owner_id = auth.uid());

-- Also ensure the trigger works correctly by making it more robust
-- Drop and recreate the trigger function with better error handling
drop trigger if exists on_relationship_created on public.relationships;
drop function if exists public.add_relationship_owner_member();

create function public.add_relationship_owner_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.relationship_members (relationship_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (relationship_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_relationship_created
  after insert on public.relationships
  for each row execute procedure public.add_relationship_owner_member();

-- Verify the relationship_members table allows the trigger to insert
-- The trigger runs as security definer (superuser) so it bypasses RLS
-- But ensure the table grants are correct
grant all on public.relationship_members to authenticated;