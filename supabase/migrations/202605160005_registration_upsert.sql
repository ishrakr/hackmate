create policy "users upsert own registrations" on public.event_registrations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
