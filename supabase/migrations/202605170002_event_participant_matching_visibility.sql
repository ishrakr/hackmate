create or replace function public.is_registered_for_event(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_registrations er
    where er.event_id = target_event_id
      and er.user_id = auth.uid()
      and er.status <> 'Cancelled'
  );
$$;

grant execute on function public.is_registered_for_event(uuid) to authenticated;

create policy "event participants see event registrations"
on public.event_registrations
for select
to authenticated
using (
  public.is_registered_for_event(event_id)
  or public.is_event_manager(event_id)
);
