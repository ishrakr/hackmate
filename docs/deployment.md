# Deployment Notes

## Deployment Requirements

- Production Supabase project.
- Configured GitHub OAuth provider.
- Configured Discord OAuth provider.
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
