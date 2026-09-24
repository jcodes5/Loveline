alter table public.memories
  add column if not exists notes text not null default ''
  check (char_length(notes) <= 2000);
