create policy "users upsert own registrations" on public.event_registrations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users leave own registrations" on public.event_registrations
for delete to authenticated
using (user_id = auth.uid());
