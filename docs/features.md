# Feature Specifications

## Authentication

- GitHub SSO.
- Protected routes.
- User role resolution after login.

## Profiles

Profiles include:

- Display name
- Avatar
- Bio
- LinkedIn
- GitHub
- Devpost
- Past projects
- Skills with competency
- Desired role
- Looking for team status
- Current team status
- Availability

Build order 4 adds the first profile management flow:

- Onboarding persists whether the user is looking for a team.
- Profile management can create or update display name, avatar, bio, links, desired role, experience level, availability, and matching eligibility.
- GitHub OAuth metadata seeds the default display name, avatar, and GitHub URL when available.

## Swipe Matching

Swipe behavior:

- Swipe is available only to solo users who marked themselves as looking for a team and teams that are actively looking for members.
- Users who already have a complete team should not be shown the swipe flow unless their team is recruiting additional members.
- After signup, users can select existing members as their team or choose looking for team.
- Teams looking for members can swipe through the available pool of participants who are looking for a team or open to joining.
- Swipe right expresses interest.
- Swipe left skips and returns the participant or team to the eligible pool.
- Mutual interest creates a match.
- Desktop users receive explicit skip and interested buttons.

Build order 7 adds the first Supabase-backed matching flow:

- Solo users marked as looking for a team can swipe through recruiting teams.
- Recruiting teams can swipe through solo users marked as looking for a team.
- Complete teams and users not looking for a team see a locked state instead of swipe cards.
- Swipe left/right decisions are persisted to `swipes` and removed from the current candidate queue.

Filters:

- Role
- Skill
- Competency
- Team status
- Experience level

## Teams

Teams support:

- Team creation.
- Team profile editing.
- Selecting existing members during or after onboarding.
- Open roles.
- Required skills.
- Recruiting status to control whether the team can access swipe matching.
- Join requests.
- Member approval.
- QR-based joining.
- Team chat.

Build order 6 adds the first team management flow:

- Authenticated users can create a team for an existing event.
- The creator is added as an approved team member and their profile is linked to the new team.
- Users can view their approved teams.
- Team profiles show event, project idea, recruiting state, project links, and members.
- Team profile editing supports name, description, project idea, GitHub, Devpost, and recruiting state.

Build order 9 adds QR-based joining:

- Team leads can generate a one-week join link and QR code from the team profile.
- Raw QR tokens are shown only in the generated URL; the database stores SHA-256 token hashes.
- `/join-team/:token` validates active tokens and creates or updates a pending join request for the signed-in user.

## Events

The participant Events screen displays upcoming admin-created hackathons with:

- Name
- Date and time
- Location
- Description
- Organizer
- Registration status
- Capacity
- Waitlist status
- Banner image

Participant event screens are read-only for event management. Event creation, editing, and participant lists belong in the admin portal.

Build order 5 adds Supabase-backed participant event screens:

- Events list reads upcoming admin-created events from `events`.
- Event details show description, date/time, venue, capacity, status, and recent announcements.
- Event subpages read `schedules` and visible `faqs`.
- Map and parking uses Leaflet with OpenStreetMap tiles, venue coordinates, parking markers, entrances, and room layout data.
- Feedback can upsert a user's event feedback.
- Event details subscribe to event announcement changes so organizer updates appear without a page refresh.

Event detail pages include:

- FAQ
- Event information
- Map
- Parking
- Hours
- Restrictions
- Schedule
- Talks
- Food
- Announcements
- Attendance check-in
- Feedback

## OpenStreetMap

Map features:

- Venue marker.
- Parking markers.
- Entrances when available.
- Room, food, help, and other organizer-defined markers.
- Room layout areas grouped by floor and area type.
- Nearby transit or useful markers when provided.
- Mobile-friendly controls.
- Address fallback for accessibility.

## Schedule

Schedule categories:

- Talks
- Workshops
- Food
- Judging
- Opening ceremony
- Closing ceremony
- Other organizer-defined events

## Chat

Channels:

- Public lobby
- Team channel
- Support chat

Requirements:

- Realtime messages.
- Timestamps.
- Sender profile previews.
- Optimistic sending.
- Loading, empty, and error states.
- Access control per channel.

## Admin Content Publishing

Admins and authorized event managers can publish operational event content from the Bootstrap admin portal:

- FAQs with category and visibility controls.
- OpenStreetMap markers for venue, parking, entrances, rooms, food, help, and other points.
- Room layout areas with floor and type labels.
- Event and global announcements with priority labels.

## Announcements

Organizers can publish:

- Event announcements.
- Global announcements.
- Priority announcements.
- Announcement history.
- In-app notification-style displays.

## Chatbot

The chatbot answers from:

- FAQ
- Schedule
- Map and location data
- Restrictions
- Hours
- Food information
- Organizer-provided event data

Unknown answers should be escalated to support chat.

## Attendance and Waitlist

Attendance statuses:

- Registered
- Waitlisted
- Checked in
- No-show
- Cancelled

## Feedback

Feedback includes:

- Overall rating
- Organization rating
- Venue rating
- Food rating
- Talks/workshops rating
- Matching experience rating
- Comments
- Anonymous option
- Would attend again
- Suggestions for improvement

## Native Mobile UX

The participant app should use native-mobile interaction patterns:

- App-style screen stack instead of desktop marketing pages.
- Bottom tab navigation for primary sections.
- Thumb-friendly buttons, rows, cards, and swipe controls.
- Safe-area padding for Android and iOS browsers.
- Short, action-oriented screen copy.
- Event, match, team, chat, and profile flows that each feel like a focused mobile screen.

## Admin Event Management

Admin portal event features:

- Create events.
- Edit event information.
- Manage event capacity and registration status.
- View participant lists by event.
- Search and filter participants.
- View registration, waitlist, check-in, and team status.
