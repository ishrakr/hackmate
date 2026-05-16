# Environment Variables

Do not commit real secrets. Use local `.env` files and deployment platform secrets.

## Required Variables

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
LLM_API_KEY=
LLM_PROVIDER=
APP_BASE_URL=
QR_TOKEN_SECRET=
```

## Variable Notes

- `VITE_SUPABASE_URL`: Public Supabase project URL used by the frontend.
- `VITE_SUPABASE_ANON_KEY`: Public Supabase anon key used by the frontend with RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: Private key for trusted backend operations only.
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret.
- `DISCORD_CLIENT_ID`: Discord OAuth app client ID.
- `DISCORD_CLIENT_SECRET`: Discord OAuth app client secret.
- `LLM_API_KEY`: API key for the selected LLM provider.
- `LLM_PROVIDER`: Identifier for the configured LLM backend.
- `APP_BASE_URL`: Base URL used for redirects and QR links.
- `QR_TOKEN_SECRET`: Secret used to sign QR team join tokens.

## Security Rules

- Only expose variables prefixed with `VITE_` to the browser.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.
- Rotate secrets if they are accidentally committed.
