# Environment Variables

Do not commit real secrets. Use local `.env` files and deployment platform secrets.

Use `.env.example` as the local template, then restart Vite after changing any `VITE_` variables.

## Required Variables

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_MODE=
VITE_ADMIN_BASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
LLM_API_KEY=
LLM_PROVIDER=
APP_BASE_URL=
QR_TOKEN_SECRET=
```

## Variable Notes

- `VITE_SUPABASE_URL`: Public Supabase project URL used by the frontend.
- `VITE_SUPABASE_ANON_KEY`: Public Supabase anon key used by the frontend with RLS.
- `VITE_APP_MODE`: Optional frontend mode. Set to `admin` for the separate admin container so `/` redirects into the admin portal.
- `VITE_ADMIN_BASE_URL`: Public admin portal origin used for admin OAuth redirects, for example `https://admin.example.com`.
- `SUPABASE_SERVICE_ROLE_KEY`: Private key for trusted backend operations only.
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID.
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret.
- `LLM_API_KEY`: API key for the selected LLM provider.
- `LLM_PROVIDER`: Identifier for the configured LLM backend.
- `APP_BASE_URL`: Base URL used for redirects and QR links.
- `QR_TOKEN_SECRET`: Secret used to sign QR team join tokens.

## Supabase Auth Redirects

Configure these redirect URLs in Supabase Auth for local development:

```txt
http://localhost:5173/auth/callback
http://localhost:5174/auth/callback
```

Production deployments should add the deployed participant and admin URLs with the same `/auth/callback` path. Set `VITE_ADMIN_BASE_URL` on the admin container to the exact public admin origin behind Coolify/Caddy.

## GitHub Signup

Supabase uses the same OAuth flow for GitHub signup and login. In Supabase Auth:

- Enable the GitHub provider.
- Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from your GitHub OAuth app.
- Keep user signups enabled if first-time GitHub users should be created automatically.
- Add `http://localhost:5173/auth/callback` and the production `/auth/callback` URL to allowed redirects.

The app requests GitHub `read:user` and `user:email` scopes so the profile can receive basic GitHub identity metadata.

## Docker Usage

Docker Compose reads the same local `.env` file as Vite. Set these before running `docker compose up --build`:

```txt
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

The `VITE_` Supabase values are passed to the dev container runtime. For production Docker builds, `VITE_SUPABASE_URL` is passed directly and `VITE_SUPABASE_ANON_KEY` is mapped to the internal Docker build argument `SUPABASE_PUBLIC_ANON` before Vite runs. Do not pass `SUPABASE_SERVICE_ROLE_KEY` into frontend Docker builds.

Compose starts two frontend containers by default:

```txt
web: http://localhost:5173
admin: http://localhost:5174
```

The `admin` service sets `VITE_APP_MODE=admin` automatically.

## Security Rules

- Only expose variables prefixed with `VITE_` to the browser.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code.
- Rotate secrets if they are accidentally committed.
