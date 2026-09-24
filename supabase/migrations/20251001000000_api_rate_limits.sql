create table public.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('ai_draft', 'quote_render', 'memory_upload')),
  window_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, category, window_start)
);

create index api_rate_limits_window_idx
  on public.api_rate_limits(window_start);

alter table public.api_rate_limits enable row level security;

create or replace function public.consume_api_rate_limit(p_category text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_window_start timestamptz := date_trunc('minute', now());
  v_limit integer;
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.';
  end if;

  v_limit := case p_category
    when 'ai_draft' then 5
    when 'quote_render' then 6
    when 'memory_upload' then 5
    else null
  end;
  if v_limit is null then
    raise exception 'Unknown rate limit category.';
  end if;

  insert into public.api_rate_limits as current_bucket (
    user_id,
    category,
    window_start,
    request_count
  )
  values (v_user_id, p_category, v_window_start, 1)
  on conflict (user_id, category, window_start)
  do update set request_count = current_bucket.request_count + 1
  where current_bucket.request_count < v_limit
  returning request_count into v_count;

  delete from public.api_rate_limits
  where user_id = v_user_id
    and category = p_category
    and window_start < v_window_start - interval '1 hour';

  if v_count is null then
    return query select false, greatest(1, 60 - extract(second from clock_timestamp())::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.consume_api_rate_limit(text) from public, anon;
grant execute on function public.consume_api_rate_limit(text) to authenticated;
