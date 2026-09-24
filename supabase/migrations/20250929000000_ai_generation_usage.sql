create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid references public.relationships(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  generation_type text not null check (char_length(generation_type) between 1 and 80),
  provider text not null default 'gemini' check (char_length(provider) <= 80),
  model text not null default 'gemini-3.6-flash' check (char_length(model) <= 120),
  prompt_tokens integer not null default 0 check (prompt_tokens >= 0),
  completion_tokens integer not null default 0 check (completion_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  status text not null default 'success' check (status in ('success', 'error')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_generations_relationship_created_idx
  on public.ai_generations(relationship_id, created_at desc);

create index if not exists ai_generations_created_by_created_idx
  on public.ai_generations(created_by, created_at desc);

alter table public.ai_generations enable row level security;

create policy "Members can view relationship AI usage"
  on public.ai_generations for select
  to authenticated
  using (
    relationship_id is not null
    and public.is_relationship_member(relationship_id)
  );

create policy "Users can view their own AI usage"
  on public.ai_generations for select
  to authenticated
  using (created_by = auth.uid());

create policy "Members can create AI usage records"
  on public.ai_generations for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      relationship_id is null
      or public.is_relationship_member(relationship_id)
    )
  );

grant select, insert on public.ai_generations to authenticated;
