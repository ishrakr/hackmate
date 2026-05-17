create unique index if not exists matches_unique_user_team_idx
on public.matches (event_id, user_a_id, team_id)
where match_type = 'user_team';

create unique index if not exists matches_unique_user_user_idx
on public.matches (event_id, least(user_a_id, user_b_id), greatest(user_a_id, user_b_id))
where match_type = 'user_user';

drop policy if exists "service admins manage matches" on public.matches;

create policy "admins manage matches"
on public.matches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "matched parties create user team matches"
on public.matches
for insert
to authenticated
with check (
  match_type = 'user_team'
  and user_a_id is not null
  and team_id is not null
  and (
    user_a_id = auth.uid()
    or public.can_manage_team(team_id)
    or public.is_team_member(team_id)
  )
  and exists (
    select 1 from public.swipes s
    where s.direction = 'right'
      and s.event_id = matches.event_id
      and s.actor_user_id = matches.user_a_id
      and s.target_team_id = matches.team_id
  )
  and exists (
    select 1 from public.swipes s
    where s.direction = 'right'
      and s.event_id = matches.event_id
      and s.actor_team_id = matches.team_id
      and s.target_user_id = matches.user_a_id
  )
);
