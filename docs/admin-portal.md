# Admin Portal

The admin portal is a dedicated Bootstrap-based interface for operational and security visibility. Event creation and event participant lists are handled here, not in the participant mobile app.

## Requirements

- Separate admin layout.
- Bootstrap UI components.
- Standalone Bootstrap sign-in and operations shell, separate from the mobile participant layout.
- Admin-only route protection.
- Server-side authorization checks.
- Pagination for large tables.
- Search and filtering.
- Audit logging for key actions.
- Event creation and editing.
- Participant lists per event.
- Dashboard metrics for events, registrations, sessions, and audit activity.
- FAQ publishing from the event editor.
- OpenStreetMap marker and room layout publishing from the event editor.
- Event and global announcement publishing.

## Admin Routes

```txt
/admin
/admin/events
/admin/events/new
/admin/events/:eventId/edit
/admin/events/:eventId/participants
/admin/users
/admin/sessions
/admin/audit-logs
```

Local standalone admin development runs on `5174` with `/` as the admin dashboard root:

```sh
npm run dev:admin
```

Docker Compose exposes the same standalone admin portal on `http://localhost:5174`. In standalone admin mode, routes are `/`, `/events`, `/events/new`, `/users`, `/sessions`, and `/audit-logs`; the combined participant app still supports `/admin/...` routes.

## Event Management

Admins can create and manage events with:

- Event name
- Description
- Start and end time
- Location and address
- Capacity
- Registration status
- Waitlist settings
- Banner image
- FAQ, schedule, restrictions, hours, parking, and food information
- Venue coordinates, parking markers, entrances, help desks, food locations, and room layout areas

Participants should only browse and register for events from the mobile app.

## Event Content Publishing

After an event is created, admins can use the event edit screen to manage:

- FAQs with category and visibility controls.
- OpenStreetMap markers for venue, parking, entrances, rooms, food, help, and other points.
- Room layout areas with floor, type, visibility, and organizer notes.
- Real-time announcements with normal, high, or urgent priority.

## Event Participants

Admins can view participant lists for each event with:

- Participant name
- User ID
- Registration status
- Waitlist status
- Check-in status
- Team status
- Team name
- Looking-for-team state
- Last activity when available

## User Management

Admins can view:

- User ID
- Display name
- Email if available through authorized auth data access
- Role assignments
- Profile summary
- Registration records
- Account status
- Created date

## Session Visibility

Admins can view:

- Login provider
- IP address
- User agent
- Login time
- Last seen time

## Audit Logs

Audit logs should include:

- Actor
- Action
- Target type
- Target ID
- IP address
- Metadata
- Timestamp

## Security Notes

- Admin pages must not rely only on frontend checks.
- RLS policies must restrict access to admin-only tables.
- Sensitive data should be minimized and displayed only when necessary.
- Event creation, event editing, and event participant lists must require admin or authorized organizer access.
- Temporary development admin access for GitHub user `ishrakr` is mirrored in database RLS by migration `202605160004_temporary_github_admin.sql`; apply migrations after deploying admin changes.
