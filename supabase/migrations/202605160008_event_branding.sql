alter table public.events
add column if not exists logo_url text,
add column if not exists cover_url text;
