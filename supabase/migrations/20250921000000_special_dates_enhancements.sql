-- Special Dates Enhancements for Sprint 7
-- Add recurrence, reminders, themes, location, memory linking, and enabled state

alter table public.special_dates
  add column if not exists recurrence text check (recurrence in ('yearly', 'monthly', 'none')) default 'yearly',
  add column if not exists remind_before_days integer check (remind_before_days >= 0 and remind_before_days <= 30) default 0,
  add column if not exists message text check (char_length(message) <= 2000) default '',
  add column if not exists theme text check (theme in ('rose', 'dusk', 'honey', 'minimal', 'romantic', 'editorial', 'polaroid', 'night', 'sunrise', 'memory')) default 'minimal',
  add column if not exists location text check (char_length(location) <= 200) default '',
  add column if not exists memory_id uuid references public.memories(id) on delete set null,
  add column if not exists enabled boolean not null default true,
  add column if not exists timezone text check (char_length(timezone) between 1 and 80) default 'UTC';

update public.special_dates
set recurrence = 'yearly',
    remind_before_days = 0,
    message = '',
    theme = 'minimal',
    location = '',
    enabled = true,
    timezone = 'UTC'
where recurrence is null;

create index if not exists special_dates_recurrence_idx
  on public.special_dates (relationship_id, recurrence)
  where recurrence != 'none' and enabled = true;

create index if not exists special_dates_upcoming_idx
  on public.special_dates (relationship_id, event_date)
  where enabled = true;

create or replace function public.get_next_occurrence(
  event_date date,
  recurrence text,
  timezone text default 'UTC'
)
returns date
language sql
stable
security definer
set search_path = public
as $$
  with dates as (
    select
      $1 as event_date,
      $2 as recurrence,
      pg_catalog.timezone($3, now())::date as local_today
  ),
  candidates as (
    select
      event_date,
      recurrence,
      local_today,
      make_date(
        extract(year from local_today)::int,
        extract(month from event_date)::int,
        least(
          extract(day from event_date)::int,
          extract(
            day from (
              date_trunc(
                'month',
                make_date(
                  extract(year from local_today)::int,
                  extract(month from event_date)::int,
                  1
                )
              ) + interval '1 month - 1 day'
            )::date
          )::int
        )
      ) as yearly_this_year,
      make_date(
        extract(year from local_today + interval '1 month')::int,
        extract(month from local_today + interval '1 month')::int,
        least(
          extract(day from event_date)::int,
          extract(
            day from (
              date_trunc('month', local_today + interval '1 month')
              + interval '1 month - 1 day'
            )::date
          )::int
        )
      ) as monthly_next_month
    from dates
  )
  select case
    when recurrence = 'none' then
      event_date
    when recurrence = 'yearly' then
      case
        when yearly_this_year >= local_today then yearly_this_year
        else make_date(
          extract(year from local_today)::int + 1,
          extract(month from event_date)::int,
          least(
            extract(day from event_date)::int,
            extract(
              day from (
                date_trunc(
                  'month',
                  make_date(
                    extract(year from local_today)::int + 1,
                    extract(month from event_date)::int,
                    1
                  )
                ) + interval '1 month - 1 day'
              )::date
            )::int
          )
        )
      end
    when recurrence = 'monthly' then
      monthly_next_month
    else
      event_date
  end
  from candidates;
$$;

create or replace function public.is_special_date_reminder_due(
  target_date date,
  remind_before_days integer default 0,
  timezone text default 'UTC'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when $2 = 0 then false
    else
      pg_catalog.timezone($3, now())::date
        between $1 - $2 and $1
  end;
$$;

grant execute on function public.get_next_occurrence(date, text, text) to authenticated;
grant execute on function public.is_special_date_reminder_due(date, integer, text) to authenticated;