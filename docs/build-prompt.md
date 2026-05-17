# Hackmate Build Prompt

Build Hackmate, a cross-platform web application optimized for Android and iOS browsers. The participant-facing application should look and feel like a native mobile app while helping hackathon participants form teams, discover event information, communicate in real time, and interact with organizers.

The app must prioritize stability, native-mobile UX patterns, accessibility, and ease of use.

## Required Stack

- ReactJS for the frontend.
- Supabase for authentication, database, storage, and realtime features.
- Docker for local development and deployment packaging.
- OpenStreetMap for event maps and parking information.
- Bootstrap for the dedicated admin portal.
- GitHub and Discord SSO for authentication.

## Required Capabilities

- Participant onboarding and profile management.
- Tinder-like swipe matching only for solo users looking for a team and teams looking for members.
- Team creation, recruiting, membership, and QR-based joining.
- Events page for upcoming hackathons.
- Event creation and event participant lists in the admin portal only.
- Event detail pages with FAQ, schedule, restrictions, hours, parking, map, talks, food, and announcements.
- Real-time public lobby, team channel, and support chat.
- Organizer announcements.
- LLM chatbot that answers from event FAQ and data feed.
- Attendance, participation, and waitlist tracking.
- Post-event feedback collection.
- Dedicated Bootstrap admin portal for event creation, participant lists, users, sessions, logs, and IP addresses.
- Supabase Row Level Security and role-based access control.

## Completion Criteria

The build is complete when authenticated users can create profiles, choose existing members as their team or mark themselves as looking for a team, browse admin-created events in a native-app-style interface, use swipe matching only when they or their team are actively looking for members, join teams by QR code, chat in authorized channels, view event information, receive announcements, check in, submit feedback, and when admins can create events, view participant lists, manage users, and audit activity through the admin portal.
