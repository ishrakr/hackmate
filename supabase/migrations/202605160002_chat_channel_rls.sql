drop policy if exists "event managers create chats" on public.chats;

create policy "authorized users create chats"
on public.chats
for insert
to authenticated
with check (
  type = 'lobby'
  or (type = 'team' and (public.is_team_member(team_id) or public.can_manage_team(team_id)))
  or (
    type = 'support'
    and event_id is not null
    and (
      public.is_event_manager(event_id)
      or exists (
        select 1
        from public.event_registrations er
        where er.event_id = chats.event_id
          and er.user_id = auth.uid()
      )
    )
  )
);

create unique index if not exists chats_global_lobby_unique_idx
on public.chats (type)
where type = 'lobby' and event_id is null and team_id is null;

create unique index if not exists chats_support_event_unique_idx
on public.chats (type, event_id)
where type = 'support' and event_id is not null and team_id is null;

create unique index if not exists chats_team_unique_idx
on public.chats (team_id)
where type = 'team' and team_id is not null;
