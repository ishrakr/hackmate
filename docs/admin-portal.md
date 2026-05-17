# Admin Portal

The admin portal is a dedicated Bootstrap-based interface for operational and security visibility. Event creation and event participant lists are handled here, not in the participant mobile app.

## Requirements

- Separate admin layout.
- Bootstrap UI components.
- Admin-only route protection.
- Server-side authorization checks.
- Pagination for large tables.
- Search and filtering.
- Audit logging for key actions.
- Event creation and editing.
- Participant lists per event.

## Admin Routes

```txt
/admin
/admin/events
/admin/events/new
/admin/events/:eventId/participants
/admin/users
/admin/sessions
/admin/audit-logs
```

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

Participants should only browse and register for events from the mobile app.

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
