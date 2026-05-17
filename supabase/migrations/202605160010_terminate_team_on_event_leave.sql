create or replace function public.terminate_event_teams_for_leaver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'Cancelled' and old.status is distinct from 'Cancelled' then
    delete from public.teams t
    where t.event_id = new.event_id
      and exists (
        select 1
        from public.team_members tm
        where tm.team_id = t.id
          and tm.user_id = new.user_id
          and tm.status = 'approved'
      );

    update public.profiles
    set current_team_id = null
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists terminate_event_teams_for_leaver on public.event_registrations;

create trigger terminate_event_teams_for_leaver
after update of status on public.event_registrations
for each row
execute function public.terminate_event_teams_for_leaver();
