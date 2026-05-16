# Feature Specifications

## Authentication

- GitHub SSO.
- Discord SSO.
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

## Events

Events page displays upcoming hackathons with:

- Name
- Date and time
- Location
- Description
- Organizer
- Registration status
- Capacity
- Waitlist status
- Banner image

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
