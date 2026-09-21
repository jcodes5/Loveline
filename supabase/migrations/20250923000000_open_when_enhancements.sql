-- Sprint 9: Open When Enhancements
-- Add cover image, media, unlock rules, and predefined occasions

-- Add new columns to open_when_letters
alter table public.open_when_letters
  add column if not exists cover_image_id text,
  add column if not exists media_id text,
  add column if not exists media_type text check (media_type in ('image', 'video', 'audio')),
  add column if not exists unlock_rule text check (unlock_rule in ('immediate', 'date', 'date_time', 'manual')),
  add column if not exists unlock_at timestamptz,
  add column if not exists occasion_type text check (occasion_type in ('miss_me', 'bad_day', 'feeling_down', 'something_good', 'cant_sleep', 'need_love', 'need_laugh', 'need_encouragement', 'custom')),
  add column if not exists is_locked boolean not null default false;

-- Update existing records to have defaults
update public.open_when_letters
set occasion_type = 'custom',
    unlock_rule = 'immediate',
    is_locked = false
where occasion_type is null;

-- Add index for locked letters queries
create index if not exists open_when_letters_locked_idx
  on public.open_when_letters(relationship_id, is_locked, unlock_at)
  where is_locked = true;

-- Create function to check if letter is unlocked
create or replace function public.is_open_when_unlocked(
  p_unlock_rule text,
  p_unlock_at timestamptz,
  p_is_locked boolean
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not p_is_locked then true
    when p_unlock_rule = 'immediate' then true
    when p_unlock_rule in ('date', 'date_time') and p_unlock_at is not null
      then timezone('utc', now()) >= p_unlock_at
    else false
  end;
$$;

grant execute on function public.is_open_when_unlocked(text, timestamptz, boolean) to authenticated;