create policy "matched parties create user user matches"
on public.matches
for insert
to authenticated
with check (
  match_type = 'user_user'
  and user_a_id is not null
  and user_b_id is not null
  and team_id is null
  and user_a_id <> user_b_id
  and (user_a_id = auth.uid() or user_b_id = auth.uid())
  and exists (
    select 1 from public.swipes s
    where s.direction = 'right'
      and s.event_id = matches.event_id
      and s.actor_user_id = matches.user_a_id
      and s.target_user_id = matches.user_b_id
  )
  and exists (
    select 1 from public.swipes s
    where s.direction = 'right'
      and s.event_id = matches.event_id
      and s.actor_user_id = matches.user_b_id
      and s.target_user_id = matches.user_a_id
  )
);
