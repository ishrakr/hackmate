create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin')
    or coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb) ? 'admin'
    or auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'
    or (
      coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'github'
      and lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'user_name', '')) = 'ishrakr'
    )
    or (
      coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'github'
      and lower(coalesce(auth.jwt() -> 'user_metadata' ->> 'preferred_username', '')) = 'ishrakr'
    );
$$;
