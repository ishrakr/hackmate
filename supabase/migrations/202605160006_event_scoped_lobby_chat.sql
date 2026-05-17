drop policy if exists "authorized users see chats" on public.chats;
drop policy if exists "authorized users create chats" on public.chats;
drop policy if exists "authorized users read messages" on public.chat_messages;
drop policy if exists "authorized users send messages" on public.chat_messages;

create policy "authorized users see chats" on public.chats for select to authenticated using (
  (
    type = 'lobby'
    and event_id is not null
    and exists (
      select 1 from public.event_registrations er
      where er.event_id = chats.event_id
        and er.user_id = auth.uid()
        and er.status <> 'Cancelled'
    )
  )
  or (type = 'team' and public.is_team_member(team_id))
  or (
    type = 'support'
    and (
      public.is_event_manager(event_id)
      or exists (
        select 1 from public.event_registrations er
        where er.event_id = chats.event_id
          and er.user_id = auth.uid()
          and er.status <> 'Cancelled'
      )
    )
  )
);

create policy "authorized users create chats"
on public.chats
for insert
to authenticated
with check (
  (
    type = 'lobby'
    and event_id is not null
    and exists (
      select 1 from public.event_registrations er
      where er.event_id = chats.event_id
        and er.user_id = auth.uid()
        and er.status <> 'Cancelled'
    )
  )
  or (type = 'team' and (public.is_team_member(team_id) or public.can_manage_team(team_id)))
  or (
    type = 'support'
    and event_id is not null
    and (
      public.is_event_manager(event_id)
      or exists (
        select 1 from public.event_registrations er
        where er.event_id = chats.event_id
          and er.user_id = auth.uid()
          and er.status <> 'Cancelled'
      )
    )
  )
);

create policy "authorized users read messages" on public.chat_messages for select to authenticated using (exists (
  select 1 from public.chats c
  where c.id = chat_messages.chat_id
    and (
      (
        c.type = 'lobby'
        and c.event_id is not null
        and exists (
          select 1 from public.event_registrations er
          where er.event_id = c.event_id
            and er.user_id = auth.uid()
            and er.status <> 'Cancelled'
        )
      )
      or (c.type = 'team' and public.is_team_member(c.team_id))
      or (
        c.type = 'support'
        and (
          public.is_event_manager(c.event_id)
          or exists (
            select 1 from public.event_registrations er
            where er.event_id = c.event_id
              and er.user_id = auth.uid()
              and er.status <> 'Cancelled'
          )
        )
      )
    )
));

create policy "authorized users send messages" on public.chat_messages for insert to authenticated with check (sender_id = auth.uid() and exists (
  select 1 from public.chats c
  where c.id = chat_messages.chat_id
    and (
      (
        c.type = 'lobby'
        and c.event_id is not null
        and exists (
          select 1 from public.event_registrations er
          where er.event_id = c.event_id
            and er.user_id = auth.uid()
            and er.status <> 'Cancelled'
        )
      )
      or (c.type = 'team' and public.is_team_member(c.team_id))
      or (
        c.type = 'support'
        and (
          public.is_event_manager(c.event_id)
          or exists (
            select 1 from public.event_registrations er
            where er.event_id = c.event_id
              and er.user_id = auth.uid()
              and er.status <> 'Cancelled'
          )
        )
      )
    )
));

drop index if exists chats_global_lobby_unique_idx;

create unique index if not exists chats_lobby_event_unique_idx
on public.chats (type, event_id)
where type = 'lobby' and event_id is not null and team_id is null;
