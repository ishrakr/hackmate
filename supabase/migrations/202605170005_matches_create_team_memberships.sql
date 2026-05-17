create or replace function public.ensure_team_for_match(target_match public.matches)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_team_id uuid;
  user_a_name text;
  user_b_name text;
begin
  if target_match.match_type = 'user_team' then
    insert into public.team_members (team_id, user_id, role, status)
    values (target_match.team_id, target_match.user_a_id, 'Member', 'approved')
    on conflict (team_id, user_id) do update
      set status = 'approved', updated_at = now();

    update public.profiles
    set current_team_id = target_match.team_id,
        looking_for_team = false,
        open_to_joining_team = false,
        updated_at = now()
    where user_id = target_match.user_a_id;

    return target_match.team_id;
  end if;

  if target_match.match_type = 'user_user' then
    select display_name into user_a_name from public.profiles where user_id = target_match.user_a_id;
    select display_name into user_b_name from public.profiles where user_id = target_match.user_b_id;

    insert into public.teams (
      event_id,
      name,
      description,
      project_idea,
      recruiting_members,
      created_by
    )
    values (
      target_match.event_id,
      concat_ws(' + ', coalesce(nullif(user_a_name, ''), 'Matched hacker'), coalesce(nullif(user_b_name, ''), 'Matched hacker')),
      'Created automatically from a mutual Hackmate match.',
      'Matched team',
      false,
      target_match.user_a_id
    )
    returning id into created_team_id;

    insert into public.team_members (team_id, user_id, role, status)
    values
      (created_team_id, target_match.user_a_id, 'Team lead', 'approved'),
      (created_team_id, target_match.user_b_id, 'Member', 'approved')
    on conflict (team_id, user_id) do update
      set status = 'approved', updated_at = now();

    insert into public.chats (team_id, type)
    select created_team_id, 'team'
    where not exists (
      select 1
      from public.chats c
      where c.team_id = created_team_id
        and c.type = 'team'
    );

    update public.profiles
    set current_team_id = created_team_id,
        looking_for_team = false,
        open_to_joining_team = false,
        updated_at = now()
    where user_id in (target_match.user_a_id, target_match.user_b_id);

    return created_team_id;
  end if;

  return null;
end;
$$;

create or replace function public.handle_match_team_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_team_for_match(new);
  return new;
end;
$$;

drop trigger if exists create_team_membership_for_match on public.matches;
create trigger create_team_membership_for_match
after insert on public.matches
for each row execute function public.handle_match_team_membership();

select public.ensure_team_for_match(m)
from public.matches m
where m.match_type in ('user_team', 'user_user');
