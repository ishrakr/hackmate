# Local Development

## Prerequisites

- Node.js LTS
- Docker Desktop
- Supabase project or local Supabase CLI setup
- GitHub OAuth app
- Discord OAuth app

## Setup Steps

1. Install dependencies.
2. Create a `.env` file using `docs/environment-variables.md`.
3. Configure Supabase URL and anon key.
4. Configure GitHub and Discord OAuth credentials in Supabase Auth.
5. Run database migrations.
6. Start the React app.
7. Start Docker services when using containerized local development.

## Docker Requirements

The project should include:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- Environment variable documentation

## Example Commands

```sh
npm install
npm run dev
```

```sh
docker compose up --build
```

## Local Verification

- Login works with GitHub and Discord.
- Profile creation works.
- Events page loads.
- Supabase queries respect RLS.
- Realtime chat sends and receives messages.
- Admin routes reject non-admin users.
