create policy "admins reset swipes" on public.swipes
for delete to authenticated
using (public.is_admin());
