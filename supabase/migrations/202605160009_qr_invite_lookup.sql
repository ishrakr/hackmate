create policy "authenticated users read active qr invites"
on public.team_qr_tokens
for select
to authenticated
using (expires_at > now());
