alter table public.swipes drop constraint if exists swipes_check3;
alter table public.swipes drop constraint if exists swipes_check4;

alter table public.swipes
add constraint swipes_no_self_user_target
check (
  actor_user_id is null
  or target_user_id is null
  or actor_user_id <> target_user_id
);

alter table public.swipes
add constraint swipes_no_self_team_target
check (
  actor_team_id is null
  or target_team_id is null
  or actor_team_id <> target_team_id
);
