# Product Requirements

## Product Summary

Hackmate is a hackathon operating platform for participants, teams, organizers, and admins. It combines team discovery, event logistics, chat, attendance, and post-event feedback in one native-app-like mobile web application.

## User Roles

### Participant

- Create and edit profile.
- Browse admin-created hackathons.
- Select existing members as a team or mark themselves as looking for a team after signup.
- Use swipe matching only when looking for a team.
- Join teams.
- Use public, team, and support chat.
- Check in to events.
- Submit post-event feedback.

### Team Lead

- Create and manage a team.
- Define open roles and required skills.
- Swipe through the available participant pool when looking for members.
- Review join requests.
- Generate QR join codes.
- Manage team chat access.

### Organizer

- Manage event information after events are created in the admin portal.
- Publish announcements.
- Manage FAQ, schedule, restrictions, hours, parking, and food information.
- Track attendance and participation.
- View feedback summaries.
- Respond to support chat.

### Admin

- View users.
- Create and edit events.
- View participant lists for each event.
- View login sessions and IP addresses.
- View audit logs.
- Manage roles and access.
- Review activity across the platform.

## Primary User Flows

1. User signs in with GitHub.
2. User completes onboarding and creates a participant profile.
3. User selects existing members as their team or marks themselves as looking for a team.
4. User browses upcoming hackathons created in the admin portal.
5. User joins or registers for an event.
6. Solo users looking for a team swipe through teams or other available participants.
7. Teams looking for members swipe through the available participant pool.
8. Mutual interest creates a match.
9. User joins a team manually or by QR code.
10. User communicates through lobby, team, or support chat.
11. User checks in at the event.
12. User submits post-event feedback.

## Non-Functional Requirements

- Native-mobile app feel on Android and iOS browsers.
- Mobile-first layout with app-style screens, bottom navigation, large touch targets, and safe-area support.
- Responsive desktop support.
- Accessible forms and navigation.
- Clear loading, empty, and error states.
- Secure data access through RLS.
- Stable realtime behavior.
- Minimal exposed personal data.

## Event Management Ownership

- Participants can browse events, register, view details, check in, and submit feedback.
- Participants cannot create events or view full participant lists from the mobile app.
- Admins create and edit events from the Bootstrap admin portal.
- Admins view event participant lists from the Bootstrap admin portal.
