# Testing Strategy

## Test Coverage

Include tests for:

- Authentication flows.
- Profile creation and editing.
- Swipe and match logic.
- Team creation and joining.
- QR token validation.
- Event registration and waitlist behavior.
- Chat permissions.
- Admin authorization.
- Feedback submission.
- Core UI loading, empty, and error states.

## Frontend Testing

Use React testing tools to verify:

- Component rendering.
- Form validation.
- Route protection.
- Empty states.
- Error states.
- Mobile-friendly interaction behavior.

## Integration Testing

Test Supabase interactions for:

- RLS policy behavior.
- Authenticated reads and writes.
- Realtime subscriptions.
- Team membership permissions.
- Admin-only table access.

## Manual QA Checklist

- GitHub login works.
- Discord login works.
- New users can complete onboarding.
- Matching creates a match on mutual right swipe.
- Team QR join rejects expired tokens.
- Team chat blocks non-members.
- Support chat reaches organizers.
- Event map works on mobile.
- Admin portal blocks non-admin users.
- Feedback can only be submitted after event completion.
