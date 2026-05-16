# Architecture

## Overview

Hackmate uses a React frontend connected to Supabase for authentication, database access, storage, realtime subscriptions, and server-side security policies.

## High-Level Components

- React application: participant, team, event, chat, and profile UI.
- Bootstrap admin portal: admin-specific layout and tables.
- Supabase Auth: GitHub and Discord SSO.
- Supabase Postgres: application data.
- Supabase Realtime: chat, announcements, and selected live updates.
- Supabase Row Level Security: authorization at the database layer.
- OpenStreetMap: maps for venues, parking, entrances, and nearby markers.
- LLM service abstraction: chatbot API wrapper that can swap providers later.

## Suggested Route Structure

```txt
/
/login
/onboarding
/events
/events/:eventId
/events/:eventId/map
/events/:eventId/schedule
/events/:eventId/faq
/events/:eventId/feedback
/match
/teams
/teams/:teamId
/teams/:teamId/chat
/join-team/:token
/chat/lobby
/chat/support
/profile
/settings
/admin
/admin/users
/admin/sessions
/admin/audit-logs
```

## Frontend Structure

Recommended source layout:

```txt
src/
  app/
  components/
  features/
    admin/
    auth/
    chatbot/
    chat/
    events/
    matching/
    profiles/
    teams/
  lib/
    supabase/
    maps/
    qr/
    llm/
  routes/
  styles/
```

## Data Access Pattern

- Use Supabase client for user-scoped reads and writes.
- Use RLS policies to enforce access control.
- Use service-role access only in trusted backend contexts.
- Keep chatbot and QR token signing behind backend/API service abstractions.

## Realtime Pattern

- Public lobby messages subscribe by event channel.
- Team messages subscribe by team membership.
- Support messages subscribe by user and organizer access.
- Announcements subscribe by event and global visibility.
