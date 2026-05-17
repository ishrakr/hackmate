# Deployment Notes

## Deployment Requirements

- Production Supabase project.
- Configured GitHub OAuth provider.
- Production environment variables.
- HTTPS-enabled app domain.
- Docker image or platform-native frontend deployment.

## Supabase Setup

- Apply database migrations.
- Enable Row Level Security on application tables.
- Add RLS policies.
- Configure OAuth redirect URLs.
- Configure storage buckets if avatars or event banners are stored in Supabase Storage.

## Production Checklist

- Verify `APP_BASE_URL` uses the production domain.
- Verify OAuth callback URLs.
- Verify no service role key is exposed in browser bundles.
- Verify admin users are assigned intentionally.
- Verify RLS policies are enabled.
- Verify QR token secret is set.
- Verify LLM API key is set only in trusted backend contexts.
- Verify Docker image builds successfully.

## Container Layout

The frontend can be deployed as separate participant and admin containers from the same source image.

- Participant container: build normally and serve the mobile app.
- Admin container: build with `VITE_APP_MODE=admin` so the root path serves the admin portal directly.

For Coolify/Caddy deployments, use the default `docker-compose.yml`. It builds production nginx containers and exposes container port `80` for both services. Point Coolify at the service named `web` for the participant app and `admin` for the standalone admin portal.

For local Docker development with Vite hot reload, use:

```sh
docker compose -f docker-compose.dev.yml up --build
```

The dev compose file exposes the participant app on `5173` and the admin portal on `5174`. The production compose file maps those same host ports to nginx port `80` for local smoke testing.

## Monitoring Recommendations

- Track authentication failures.
- Track realtime chat errors.
- Track admin actions.
- Track QR join failures.
- Track chatbot escalation rate.
- Track event check-in counts.

## Future Improvements

- Native mobile wrapper if needed.
- Push notifications.
- Organizer analytics dashboard.
- Advanced recommendation algorithm for matching.
- Calendar integration.
- Badge or achievement system for participants.
