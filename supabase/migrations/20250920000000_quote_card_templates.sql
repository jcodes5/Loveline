-- Add template support to quote_cards
create type public.quote_card_template as enum (
  'minimal',
  'romantic',
  'editorial',
  'polaroid',
  'night',
  'sunrise',
  'memory'
);

alter table public.quote_cards
  add column template public.quote_card_template not null default 'minimal';

create index quote_cards_template_idx on public.quote_cards(template);