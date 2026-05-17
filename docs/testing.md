# Testing Strategy

## Test Coverage

Include tests for:

- Authentication flows.
- Profile creation and editing.
- Swipe eligibility and match logic.
- Team creation and joining.
- QR token validation.
- Event registration and waitlist behavior.
- Admin event creation and participant list access.
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
- Native-mobile layout behavior, including bottom tabs, safe-area spacing, and large touch targets.

## Integration Testing

Test Supabase interactions for:

- RLS policy behavior.
- Authenticated reads and writes.
- Realtime subscriptions.
- Team membership permissions.
- Admin-only table access.
- Admin-only event creation and participant list access.

## Manual QA Checklist

- GitHub login works.
- New users can complete onboarding.
- New users can select existing members as their team or choose looking for team.
- Swipe is hidden for users who already have a team that is not recruiting.
- Teams marked as recruiting can swipe through the eligible participant pool.
- Matching creates a match on mutual right swipe.
- Team QR join rejects expired tokens.
- Team chat blocks non-members.
- Support chat reaches organizers.
- Event map works on mobile.
- Admin portal blocks non-admin users.
- Event creation is available in the admin portal only.
- Event participant lists are available in the admin portal only.
- Feedback can only be submitted after event completion.
