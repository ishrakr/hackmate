# Admin Portal

The admin portal is a dedicated Bootstrap-based interface for operational and security visibility.

## Requirements

- Separate admin layout.
- Bootstrap UI components.
- Admin-only route protection.
- Server-side authorization checks.
- Pagination for large tables.
- Search and filtering.
- Audit logging for key actions.

## Admin Routes

```txt
/admin
/admin/users
/admin/sessions
/admin/audit-logs
```

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
