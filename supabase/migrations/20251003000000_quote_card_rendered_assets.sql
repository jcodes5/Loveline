alter table public.quote_cards
  add column if not exists rendered_public_id text,
  add column if not exists rendered_format text;
