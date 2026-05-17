# Hackmate

# AUTHORS:
Ishrak Rahman
Abdullah Asraf Abir
Huzaifa Quaid Johar

Hackmate is a mobile-first hackathon companion web application for participants, teams, organizers, and admins. It should feel like a native mobile application on Android and iOS browsers while supporting a separate Bootstrap admin portal for operations.

## Core Goals

- Help participants either form an initial team from existing members or mark themselves as looking for a team.
- Help teams that still need members recruit participants by role and skill.
- Provide event information, maps, schedules, FAQs, announcements, and feedback.
- Support real-time public, team, and support chat.
- Provide admin tools for creating events, viewing participant lists, managing users, attendance, logs, and sessions.
- Deliver a stable, accessible, native-app-like experience on Android and iOS browsers.

## Tech Stack

- Frontend: ReactJS
- Backend, auth, database, realtime: Supabase
- Maps: OpenStreetMap
- Containerization: Docker
- Admin portal UI: Bootstrap
- SSO providers: GitHub and Discord

## Documentation

- [Build Prompt](docs/build-prompt.md)
- [Product Requirements](docs/product-requirements.md)
- [Architecture](docs/architecture.md)
- [Local Development](docs/local-development.md)
- [Environment Variables](docs/environment-variables.md)
- [Database Schema](docs/database-schema.md)
- [Security Model](docs/security.md)
- [Feature Specifications](docs/features.md)
- [Admin Portal](docs/admin-portal.md)
- [Testing Strategy](docs/testing.md)
- [Deployment Notes](docs/deployment.md)

## Development

```sh
npm install
npm run dev
```

Run the Docker development server with:

```sh
docker compose up --build
```

Build for production with:

```sh
npm run build
```

## Initial Build Order

1. Set up React app, routing, styling foundation, and Docker.
2. Configure Supabase client and authentication.
3. Create database schema and Row Level Security policies.
4. Build onboarding and profile management.
5. Build events listing and event detail pages.
6. Build team creation and team profiles.
7. Build swipe-based matching for users and teams that are actively looking for members.
8. Build live chat.
9. Build QR-based team joining.
10. Build organizer announcements.
11. Build attendance, waitlist, and participation tracking.
12. Build chatbot integration.
13. Build post-event feedback.
14. Build Bootstrap admin portal.
15. Add tests, security hardening, and documentation.
