create table public.event_map_markers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  label text not null,
  description text,
  marker_type text not null default 'venue' check (marker_type in ('venue', 'parking', 'entrance', 'room', 'food', 'help', 'other')),
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  floor text,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_room_areas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  floor text,
  area_type text not null default 'room' check (area_type in ('room', 'sponsor', 'workshop', 'judging', 'food', 'quiet', 'restricted', 'other')),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index event_map_markers_event_id_idx on public.event_map_markers(event_id, marker_type, sort_order);
create index event_room_areas_event_id_idx on public.event_room_areas(event_id, floor, sort_order);

create trigger set_event_map_markers_updated_at before update on public.event_map_markers for each row execute function public.set_updated_at();
create trigger set_event_room_areas_updated_at before update on public.event_room_areas for each row execute function public.set_updated_at();

alter table public.event_map_markers enable row level security;
alter table public.event_room_areas enable row level security;

create policy "visible event map markers are readable" on public.event_map_markers
  for select to anon, authenticated
  using (visible or public.is_event_manager(event_id));

create policy "event managers manage map markers" on public.event_map_markers
  for all to authenticated
  using (public.is_event_manager(event_id))
  with check (public.is_event_manager(event_id));

create policy "visible event room areas are readable" on public.event_room_areas
  for select to anon, authenticated
  using (visible or public.is_event_manager(event_id));

create policy "event managers manage room areas" on public.event_room_areas
  for all to authenticated
  using (public.is_event_manager(event_id))
  with check (public.is_event_manager(event_id));

create policy "event managers update announcements" on public.announcements
  for update to authenticated
  using (event_id is null and public.is_admin() or public.is_event_manager(event_id))
  with check (event_id is null and public.is_admin() or public.is_event_manager(event_id));

grant select on public.event_map_markers, public.event_room_areas to anon;
grant select, insert, update, delete on public.event_map_markers, public.event_room_areas to authenticated;
