create unique index if not exists chats_lobby_singleton_idx
  on public.chats (type)
  where type = 'lobby' and event_id is null and team_id is null;

create unique index if not exists chats_team_singleton_idx
  on public.chats (team_id)
  where type = 'team' and team_id is not null;

create unique index if not exists chats_support_event_singleton_idx
  on public.chats (event_id)
  where type = 'support' and event_id is not null and team_id is null;

create policy "authenticated users create lobby chats"
  on public.chats
  for insert
  to authenticated
  with check (type = 'lobby' and event_id is null and team_id is null);

create policy "team members create team chats"
  on public.chats
  for insert
  to authenticated
  with check (type = 'team' and team_id is not null and public.is_team_member(team_id));

create policy "registered users create support chats"
  on public.chats
  for insert
  to authenticated
  with check (
    type = 'support'
    and event_id is not null
    and team_id is null
    and exists (
      select 1
      from public.event_registrations er
      where er.event_id = chats.event_id
        and er.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
