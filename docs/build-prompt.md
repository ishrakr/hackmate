# Hackmate Build Prompt

Build Hackmate, a cross-platform web application optimized for Android and iOS browsers. The application should help hackathon participants form teams, discover event information, communicate in real time, and interact with organizers.

The app must prioritize stability, mobile-first UX, accessibility, and ease of use.

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
- Event detail pages with FAQ, schedule, restrictions, hours, parking, map, talks, food, and announcements.
- Real-time public lobby, team channel, and support chat.
- Organizer announcements.
- LLM chatbot that answers from event FAQ and data feed.
- Attendance, participation, and waitlist tracking.
- Post-event feedback collection.
- Dedicated Bootstrap admin portal for users, sessions, logs, and IP addresses.
- Supabase Row Level Security and role-based access control.

## Completion Criteria

The build is complete when authenticated users can create profiles, choose existing members as their team or mark themselves as looking for a team, browse events, use swipe matching only when they or their team are actively looking for members, join teams by QR code, chat in authorized channels, view event information, receive announcements, check in, submit feedback, and when admins can manage users and audit activity through the admin portal.
