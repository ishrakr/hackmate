# Local Development

## Prerequisites

- Node.js LTS
- Docker Desktop
- Supabase project or local Supabase CLI setup
- GitHub OAuth app
- Discord OAuth app

## Setup Steps

1. Install dependencies with `npm install`.
2. Create a `.env` file from `.env.example` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Configure GitHub and Discord providers in Supabase Auth with `/auth/callback` redirects.
4. Start the React app with `npm run dev`.
5. Open the local Vite URL shown in the terminal.
6. Start Docker services with `docker compose up --build` when using containerized development.
7. Run database migrations with `supabase db push` or through your Supabase project's SQL editor.

## Docker Requirements

The project should include:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `nginx.conf` for production SPA routing fallback
- Environment variable documentation

## Example Commands

```sh
npm install
npm run dev
```

```sh
docker compose up --build
```

```sh
npm run build
docker compose config
```

```sh
supabase db push
```

If you are using a hosted Supabase project without the CLI, run the SQL files in `supabase/migrations/` from the Supabase dashboard SQL editor in filename order.

## Local Verification

- Login works with GitHub and Discord.
- Profile creation works.
- Events page loads.
- Supabase queries respect RLS.
- Realtime chat sends and receives messages.
- Admin routes reject non-admin users.
