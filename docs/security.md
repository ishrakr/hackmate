# Security Model

## Authentication

Hackmate uses Supabase Auth with GitHub and Discord SSO.

Requirements:

- Protected routes for authenticated features.
- Session persistence.
- Secure logout.
- Role-based access control.
- Admin-only routes for the admin portal.

## Authorization

Authorization must be enforced through Supabase Row Level Security policies and server-side checks for sensitive operations.

## Row Level Security Requirements

- Users can read public profile fields needed for matching.
- Users can update only their own profile.
- Users can view only chats they are authorized to access.
- Team chat requires approved team membership.
- Support chat requires participant, organizer, or admin access.
- Admin data requires admin role.
- Organizer event management requires organizer role for that event.
- QR token validation must happen in a trusted context.

## Sensitive Data

Protect:

- IP addresses
- Login session records
- Audit logs
- Private contact preferences
- Admin role assignments
- Service role credentials

## QR Security

- Use signed or hashed tokens.
- Store token hashes instead of raw tokens.
- Add expiration times.
- Require authentication before joining a team.
- Reject expired or invalid tokens gracefully.

## Chat Security

- Validate channel access before reads and writes.
- Prevent non-members from accessing team channels.
- Support moderation and message deletion.
- Avoid exposing private support conversations.

## LLM Chatbot Safety

- Answer only from event data, FAQ, schedule, restrictions, map data, and organizer-provided information.
- Do not invent event facts.
- Escalate unknown questions to support chat.
- Avoid sending unnecessary private user data to the LLM provider.

## Admin Security

- Protect admin routes at the UI and database layers.
- Log key admin actions.
- Paginate large data tables.
- Restrict session and IP address access to admins.
