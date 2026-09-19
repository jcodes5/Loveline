alter table public.notification_preferences
  add column personal_messages_time time not null default time '09:00',
  add column personal_messages_timezone text not null default 'UTC'
    check (char_length(personal_messages_timezone) between 1 and 80);
