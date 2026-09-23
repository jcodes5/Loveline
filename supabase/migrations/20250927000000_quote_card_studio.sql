-- Sprint 12: Visual Quote Card Studio
-- Adds studio-facing template + background/typography metadata to quote_cards.

-- Run in Supabase SQL Editor (idempotent).

do $$
begin
  -- Add 'letterpress' to the quote_card_template enum if missing.
  -- NOTE: ADD VALUE cannot run inside a transaction; each statement here is
  -- auto-committed by the SQL Editor, so this is safe.
  if not exists (select 1 from pg_type where typname = 'quote_card_template') then
    create type public.quote_card_template as enum (
      'minimal', 'romantic', 'editorial', 'polaroid', 'night', 'sunrise', 'memory', 'letterpress'
    );
  else
    begin
      alter type public.quote_card_template add value if not exists 'letterpress';
    exception when duplicate_object then null;
    end;
  end if;
end $$;

alter table public.quote_cards
  add column if not exists bg_type text not null default 'template',
  add column if not exists gradient text,
  add column if not exists background_data_url text,
  add column if not exists alignment text not null default 'center',
  add column if not exists show_date boolean not null default false;