# Database Schema

Use UUID primary keys where appropriate. Include `created_at` and `updated_at` timestamps on application tables.

The initial schema and Row Level Security policies live in `supabase/migrations/202605160001_initial_schema.sql`.

## Core Tables

### profiles

Stores public and semi-public user profile data.

Fields:

- `id`
- `user_id`
- `display_name`
- `avatar_url`
- `bio`
- `location`
- `linkedin_url`
- `github_url`
- `devpost_url`
- `experience_level`
- `desired_role`
- `looking_for_team`
- `current_team_id`
- `open_to_joining_team`
- `availability`
- `contact_preferences`
- `created_at`
- `updated_at`

### skills

- `id`
- `name`
- `created_at`

### user_skills

- `id`
- `user_id`
- `skill_id`
- `competency`
- `created_at`

Competency values:

- Beginner
- Intermediate
- Advanced
- Expert

### events

- `id`
- `name`
- `description`
- `starts_at`
- `ends_at`
- `location_name`
- `address`
- `latitude`
- `longitude`
- `capacity`
- `registration_status`
- `banner_url`
- `organizer_id`
- `created_at`
- `updated_at`

### event_registrations

- `id`
- `event_id`
- `user_id`
- `status`
- `created_at`
- `updated_at`

Statuses:

- Registered
- Waitlisted
- Checked in
- No-show
- Cancelled

### teams

- `id`
- `event_id`
- `name`
- `description`
- `project_idea`
- `github_url`
- `devpost_url`
- `recruiting_members`
- `created_by`
- `created_at`
- `updated_at`

### team_members

- `id`
- `team_id`
- `user_id`
- `role`
- `status`
- `created_at`
- `updated_at`

### team_join_requests

- `id`
- `team_id`
- `user_id`
- `status`
- `message`
- `created_at`
- `updated_at`

### team_qr_tokens

- `id`
- `team_id`
- `token_hash`
- `expires_at`
- `created_by`
- `created_at`

### swipes

Swipes should only be created when the actor is eligible for matching. Eligible actors are solo users marked as looking for a team or teams marked as recruiting members.

- `id`
- `actor_user_id`
- `actor_team_id`
- `target_user_id`
- `target_team_id`
- `event_id`
- `direction`
- `created_at`

### matches

- `id`
- `event_id`
- `user_a_id`
- `user_b_id`
- `team_id`
- `match_type`
- `created_at`

### chats

- `id`
- `event_id`
- `team_id`
- `type`
- `created_at`

Chat types:

- Public lobby
- Team channel
- Support chat

### chat_messages

- `id`
- `chat_id`
- `sender_id`
- `body`
- `created_at`
- `edited_at`
- `deleted_at`

### announcements

- `id`
- `event_id`
- `author_id`
- `title`
- `body`
- `priority`
- `created_at`

### faqs

- `id`
- `event_id`
- `question`
- `answer`
- `category`
- `visible`
- `created_at`
- `updated_at`

### schedules

- `id`
- `event_id`
- `title`
- `description`
- `starts_at`
- `ends_at`
- `location`
- `category`
- `speaker_or_host`
- `link_url`
- `created_at`
- `updated_at`

### feedback

- `id`
- `event_id`
- `user_id`
- `overall_rating`
- `organization_rating`
- `venue_rating`
- `food_rating`
- `talks_rating`
- `matching_rating`
- `comments`
- `anonymous`
- `would_attend_again`
- `created_at`

### audit_logs

- `id`
- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `ip_address`
- `metadata`
- `created_at`

### login_sessions

- `id`
- `user_id`
- `provider`
- `ip_address`
- `user_agent`
- `created_at`
- `last_seen_at`

### event_map_markers

- `id`
- `event_id`
- `label`
- `description`
- `marker_type`
- `latitude`
- `longitude`
- `floor`
- `sort_order`
- `visible`
- `created_at`
- `updated_at`

### event_room_areas

- `id`
- `event_id`
- `name`
- `description`
- `floor`
- `area_type`
- `sort_order`
- `visible`
- `created_at`
- `updated_at`

## Additional Tables

- `roles`
- `user_roles`
- `attendance_records`
- `chatbot_conversations`
- `chatbot_messages`
- `event_restrictions`
