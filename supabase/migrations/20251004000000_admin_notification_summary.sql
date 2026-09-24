create or replace function public.get_relationship_notification_summary(target_relationship_id uuid)
returns table (
  total_devices bigint,
  enabled_devices bigint,
  last_device_seen_at timestamptz,
  deliveries_7d bigint,
  last_delivery_category text,
  last_delivery_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_relationship_owner(target_relationship_id) then
    raise exception 'Only the relationship owner can view notification status.'
      using errcode = '42501';
  end if;

  return query
  with device_status as (
    select
      count(*)::bigint as total_devices,
      (count(*) filter (where device.enabled))::bigint as enabled_devices,
      max(device.last_seen_at) as last_device_seen_at
    from public.notification_devices as device
    where device.relationship_id = target_relationship_id
  ), delivery_rows as (
    select delivery.category::text as category, delivery.delivered_at
    from public.notification_deliveries as delivery
    where delivery.relationship_id = target_relationship_id
      and delivery.delivered_at >= now() - interval '7 days'
    union all
    select 'personal_message'::text as category, delivery.delivered_at
    from public.personal_message_deliveries as delivery
    join public.personal_messages as message
      on message.id = delivery.personal_message_id
    where message.relationship_id = target_relationship_id
      and delivery.delivered_at >= now() - interval '7 days'
  ), delivery_status as (
    select
      count(*)::bigint as deliveries_7d,
      (array_agg(category order by delivered_at desc))[1] as last_delivery_category,
      max(delivered_at) as last_delivery_at
    from delivery_rows
  )
  select
    device_status.total_devices,
    device_status.enabled_devices,
    device_status.last_device_seen_at,
    delivery_status.deliveries_7d,
    delivery_status.last_delivery_category,
    delivery_status.last_delivery_at
  from device_status
  cross join delivery_status;
end;
$$;

revoke all on function public.get_relationship_notification_summary(uuid) from public;
grant execute on function public.get_relationship_notification_summary(uuid) to authenticated;
