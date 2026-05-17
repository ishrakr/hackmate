create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('admin', 'organizer', 'participant')),
  created_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  event_id uuid,
  created_at timestamptz not null default now(),
  unique (user_id, role_id, event_id)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location_name text,
  address text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  capacity integer check (capacity is null or capacity >= 0),
  registration_status text not null default 'draft' check (registration_status in ('draft', 'open', 'waitlist', 'closed', 'cancelled')),
  banner_url text,
  organizer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  project_idea text,
  github_url text,
  devpost_url text,
  recruiting_members boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  location text,
  linkedin_url text,
  github_url text,
  devpost_url text,
  experience_level text check (experience_level is null or experience_level in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  desired_role text,
  looking_for_team boolean not null default false,
  current_team_id uuid references public.teams(id) on delete set null,
  open_to_joining_team boolean not null default false,
  availability text,
  contact_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  competency text not null check (competency in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'Registered' check (status in ('Registered', 'Waitlisted', 'Checked in', 'No-show', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.team_join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.team_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.swipes (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete cascade,
  actor_team_id uuid references public.teams(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  target_team_id uuid references public.teams(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  check ((actor_user_id is not null)::integer + (actor_team_id is not null)::integer = 1),
  check ((target_user_id is not null)::integer + (target_team_id is not null)::integer = 1),
  check (actor_user_id is distinct from target_user_id),
  check (actor_team_id is distinct from target_team_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_a_id uuid references auth.users(id) on delete cascade,
  user_b_id uuid references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  match_type text not null check (match_type in ('user_user', 'user_team')),
  created_at timestamptz not null default now(),
  check (
    (match_type = 'user_user' and user_a_id is not null and user_b_id is not null and team_id is null) or
    (match_type = 'user_team' and user_a_id is not null and user_b_id is null and team_id is not null)
  )
);

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  type text not null check (type in ('lobby', 'team', 'support')),
  created_at timestamptz not null default now(),
  check ((type = 'team' and team_id is not null) or (type <> 'team'))
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  created_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question text not null,
  answer text not null,
  category text,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  category text,
  speaker_or_host text,
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  overall_rating integer check (overall_rating between 1 and 5),
  organization_rating integer check (organization_rating between 1 and 5),
  venue_rating integer check (venue_rating between 1 and 5),
  food_rating integer check (food_rating between 1 and 5),
  talks_rating integer check (talks_rating between 1 and 5),
  matching_rating integer check (matching_rating between 1 and 5),
  comments text,
  anonymous boolean not null default false,
  would_attend_again boolean,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  ip_address inet,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.login_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.user_roles add constraint user_roles_event_id_fkey foreign key (event_id) references public.events(id) on delete cascade;

create index user_roles_user_id_idx on public.user_roles(user_id);
create index user_roles_event_id_idx on public.user_roles(event_id);
create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_matching_idx on public.profiles(looking_for_team, open_to_joining_team);
create index user_skills_user_id_idx on public.user_skills(user_id);
create index event_registrations_user_id_idx on public.event_registrations(user_id);
create index event_registrations_event_id_idx on public.event_registrations(event_id);
create index teams_event_id_idx on public.teams(event_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_join_requests_team_id_idx on public.team_join_requests(team_id);
create index swipes_actor_user_id_idx on public.swipes(actor_user_id);
create index swipes_actor_team_id_idx on public.swipes(actor_team_id);
create index matches_event_id_idx on public.matches(event_id);
create index chats_event_id_idx on public.chats(event_id);
create index chats_team_id_idx on public.chats(team_id);
create index chat_messages_chat_id_created_at_idx on public.chat_messages(chat_id, created_at);
create index announcements_event_id_created_at_idx on public.announcements(event_id, created_at desc);
create index faqs_event_id_idx on public.faqs(event_id);
create index schedules_event_id_starts_at_idx on public.schedules(event_id, starts_at);
create index feedback_event_id_idx on public.feedback(event_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index login_sessions_user_id_idx on public.login_sessions(user_id);

create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger set_teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger set_event_registrations_updated_at before update on public.event_registrations for each row execute function public.set_updated_at();
create trigger set_team_members_updated_at before update on public.team_members for each row execute function public.set_updated_at();
create trigger set_team_join_requests_updated_at before update on public.team_join_requests for each row execute function public.set_updated_at();
create trigger set_faqs_updated_at before update on public.faqs for each row execute function public.set_updated_at();
create trigger set_schedules_updated_at before update on public.schedules for each row execute function public.set_updated_at();

insert into public.roles (name)
values ('admin'), ('organizer'), ('participant')
on conflict (name) do nothing;

create or replace function public.has_role(role_name text, target_event_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.name = role_name
      and (target_event_id is null or ur.event_id is null or ur.event_id = target_event_id)
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin'
    or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin';
$$;

create or replace function public.is_event_manager(target_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or public.has_role('organizer', target_event_id)
    or exists (
      select 1 from public.events e
      where e.id = target_event_id and e.organizer_id = auth.uid()
    );
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team_id
      and tm.user_id = auth.uid()
      and tm.status = 'approved'
  );
$$;

create or replace function public.can_manage_team(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.teams t
      where t.id = target_team_id and t.created_by = auth.uid()
    );
$$;

alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.skills enable row level security;
alter table public.profiles enable row level security;
alter table public.user_skills enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_join_requests enable row level security;
alter table public.team_qr_tokens enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.chats enable row level security;
alter table public.chat_messages enable row level security;
alter table public.announcements enable row level security;
alter table public.faqs enable row level security;
alter table public.schedules enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.login_sessions enable row level security;

create policy "roles are visible to authenticated users" on public.roles for select to authenticated using (true);
create policy "admins manage roles" on public.roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "users see their own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins manage user roles" on public.user_roles for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "skills are readable" on public.skills for select to anon, authenticated using (true);
create policy "admins manage skills" on public.skills for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "profiles are readable for matching" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "admins delete profiles" on public.profiles for delete to authenticated using (public.is_admin());

create policy "user skills are readable" on public.user_skills for select to authenticated using (true);
create policy "users manage own skills" on public.user_skills for all to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "published events are readable" on public.events for select to anon, authenticated using (registration_status <> 'draft' or public.is_event_manager(id));
create policy "event managers create events" on public.events for insert to authenticated with check (public.is_admin() or public.has_role('organizer'));
create policy "event managers update events" on public.events for update to authenticated using (public.is_event_manager(id)) with check (public.is_event_manager(id));
create policy "admins delete events" on public.events for delete to authenticated using (public.is_admin());

create policy "users see own registrations" on public.event_registrations for select to authenticated using (user_id = auth.uid() or public.is_event_manager(event_id));
create policy "users register themselves" on public.event_registrations for insert to authenticated with check (user_id = auth.uid());
create policy "users update own registration" on public.event_registrations for update to authenticated using (user_id = auth.uid() or public.is_event_manager(event_id)) with check (user_id = auth.uid() or public.is_event_manager(event_id));
create policy "event managers delete registrations" on public.event_registrations for delete to authenticated using (public.is_event_manager(event_id));

create policy "teams are readable in event context" on public.teams for select to authenticated using (true);
create policy "authenticated users create teams" on public.teams for insert to authenticated with check (created_by = auth.uid());
create policy "team creators and admins update teams" on public.teams for update to authenticated using (public.can_manage_team(id) or public.is_event_manager(event_id)) with check (public.can_manage_team(id) or public.is_event_manager(event_id));
create policy "team creators and admins delete teams" on public.teams for delete to authenticated using (public.can_manage_team(id) or public.is_event_manager(event_id));

create policy "team members visible to authenticated users" on public.team_members for select to authenticated using (true);
create policy "users request membership rows for themselves" on public.team_members for insert to authenticated with check (user_id = auth.uid() or public.can_manage_team(team_id));
create policy "team managers update members" on public.team_members for update to authenticated using (public.can_manage_team(team_id) or user_id = auth.uid()) with check (public.can_manage_team(team_id) or user_id = auth.uid());
create policy "team managers delete members" on public.team_members for delete to authenticated using (public.can_manage_team(team_id));

create policy "join requests visible to requester and team managers" on public.team_join_requests for select to authenticated using (user_id = auth.uid() or public.can_manage_team(team_id));
create policy "users create own join requests" on public.team_join_requests for insert to authenticated with check (user_id = auth.uid());
create policy "requester or manager update join requests" on public.team_join_requests for update to authenticated using (user_id = auth.uid() or public.can_manage_team(team_id)) with check (user_id = auth.uid() or public.can_manage_team(team_id));
create policy "team managers delete join requests" on public.team_join_requests for delete to authenticated using (public.can_manage_team(team_id));

create policy "team managers manage qr tokens" on public.team_qr_tokens for all to authenticated using (public.can_manage_team(team_id)) with check (public.can_manage_team(team_id) and created_by = auth.uid());

create policy "users see their swipes" on public.swipes for select to authenticated using (actor_user_id = auth.uid() or target_user_id = auth.uid() or public.is_team_member(actor_team_id) or public.is_team_member(target_team_id));
create policy "eligible users create swipes" on public.swipes for insert to authenticated with check (actor_user_id = auth.uid() or public.can_manage_team(actor_team_id));
create policy "admins delete swipes" on public.swipes for delete to authenticated using (public.is_admin());

create policy "matched parties see matches" on public.matches for select to authenticated using (user_a_id = auth.uid() or user_b_id = auth.uid() or public.is_team_member(team_id) or public.is_event_manager(event_id));
create policy "service admins manage matches" on public.matches for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authorized users see chats" on public.chats for select to authenticated using (
  type = 'lobby'
  or (type = 'team' and public.is_team_member(team_id))
  or (type = 'support' and (public.is_event_manager(event_id) or exists (select 1 from public.event_registrations er where er.event_id = chats.event_id and er.user_id = auth.uid())))
);
create policy "event managers create chats" on public.chats for insert to authenticated with check (public.is_event_manager(event_id) or public.can_manage_team(team_id));
create policy "event managers update chats" on public.chats for update to authenticated using (public.is_event_manager(event_id) or public.can_manage_team(team_id)) with check (public.is_event_manager(event_id) or public.can_manage_team(team_id));

create policy "authorized users read messages" on public.chat_messages for select to authenticated using (exists (
  select 1 from public.chats c
  where c.id = chat_messages.chat_id
    and (
      c.type = 'lobby'
      or (c.type = 'team' and public.is_team_member(c.team_id))
      or (c.type = 'support' and (public.is_event_manager(c.event_id) or exists (select 1 from public.event_registrations er where er.event_id = c.event_id and er.user_id = auth.uid())))
    )
));
create policy "authorized users send messages" on public.chat_messages for insert to authenticated with check (sender_id = auth.uid() and exists (
  select 1 from public.chats c
  where c.id = chat_messages.chat_id
    and (
      c.type = 'lobby'
      or (c.type = 'team' and public.is_team_member(c.team_id))
      or (c.type = 'support' and (public.is_event_manager(c.event_id) or exists (select 1 from public.event_registrations er where er.event_id = c.event_id and er.user_id = auth.uid())))
    )
));
create policy "senders edit own messages" on public.chat_messages for update to authenticated using (sender_id = auth.uid() or public.is_admin()) with check (sender_id = auth.uid() or public.is_admin());

create policy "announcements are readable" on public.announcements for select to anon, authenticated using (true);
create policy "event managers create announcements" on public.announcements for insert to authenticated with check (author_id = auth.uid() and (event_id is null and public.is_admin() or public.is_event_manager(event_id)));
create policy "event managers delete announcements" on public.announcements for delete to authenticated using (event_id is null and public.is_admin() or public.is_event_manager(event_id));

create policy "visible faqs are readable" on public.faqs for select to anon, authenticated using (visible or public.is_event_manager(event_id));
create policy "event managers manage faqs" on public.faqs for all to authenticated using (public.is_event_manager(event_id)) with check (public.is_event_manager(event_id));

create policy "schedules are readable" on public.schedules for select to anon, authenticated using (true);
create policy "event managers manage schedules" on public.schedules for all to authenticated using (public.is_event_manager(event_id)) with check (public.is_event_manager(event_id));

create policy "users and managers read feedback" on public.feedback for select to authenticated using (user_id = auth.uid() or public.is_event_manager(event_id));
create policy "users create own feedback" on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy "users update own feedback" on public.feedback for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "event managers delete feedback" on public.feedback for delete to authenticated using (public.is_event_manager(event_id));

create policy "admins read audit logs" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "admins create audit logs" on public.audit_logs for insert to authenticated with check (public.is_admin());

create policy "admins read login sessions" on public.login_sessions for select to authenticated using (public.is_admin());
create policy "users read own login sessions" on public.login_sessions for select to authenticated using (user_id = auth.uid());
create policy "admins manage login sessions" on public.login_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.skills, public.events, public.announcements, public.faqs, public.schedules to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
