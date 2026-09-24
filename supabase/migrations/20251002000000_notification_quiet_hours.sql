alter table public.notification_preferences
  add column if not exists quiet_hours_enabled boolean not null default false,
  add column if not exists quiet_hours_start time not null default time '22:00',
  add column if not exists quiet_hours_end time not null default time '07:00';
