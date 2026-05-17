import { lazy, Suspense, useEffect, useState } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import {
  consumeOAuthFlow,
  peekOAuthFlow,
  useAuth,
} from "../features/auth/auth-context.jsx";
import { consumeAdminOAuthIntent } from "../lib/oauth-intent.js";
import { ChatRoom, EventChatRoom } from "../features/chat/ChatRoom.jsx";
import { EventChatbot } from "../features/chat/EventChatbot.jsx";
import {
  countLiveEvents,
  getEvent,
  getEventAnnouncements,
  getEventFaqs,
  getEventMapMarkers,
  getEventRoomAreas,
  getEventSchedule,
  leaveEvent,
  listUserEventRegistrations,
  listEvents,
  registerForEvent,
  subscribeToEventAnnouncements,
  upsertFeedback,
} from "../features/events/event-service.js";
import {
  createSwipe,
  getMatchingContext,
  listCandidates,
} from "../features/matching/matching-service.js";
import {
  buildDefaultProfile,
  getProfile,
  upsertProfile,
} from "../features/profiles/profile-service.js";
import {
  AdminAuthCallbackPage,
  AdminDashboardPage,
  AdminEventEditorPage,
  AdminEventsPage,
  AdminLayout,
  AdminNotFoundPage,
  AdminParticipantsPage,
  AdminTablePage,
  RequireAdmin,
} from "../features/admin/admin-portal.jsx";
import {
  createJoinRequest,
  createTeam,
  createTeamJoinToken,
  getTeamByJoinToken,
  getTeam,
  listUserTeams,
  updateTeam,
} from "../features/teams/team-service.js";

const bottomTabs = [
  { to: "/", label: "Home", icon: "fa-solid fa-house" },
  { to: "/events", label: "Events", icon: "fa-solid fa-ticket" },
  { to: "/match", label: "Match", icon: "fa-solid fa-user-group" },
  { to: "/chat/lobby", label: "Chat", icon: "fa-solid fa-comments" },
  { to: "/profile", label: "Me", icon: "fa-solid fa-user" },
];

const sampleMembers = ["Alex", "Mina", "Jordan"];
const isAdminContainer = import.meta.env.VITE_APP_MODE === "admin";
const EventMap = lazy(() =>
  import("../features/events/EventMap.jsx").then((module) => ({
    default: module.EventMap,
  })),
);
const participantAdminRedirect = import.meta.env.VITE_ADMIN_BASE_URL || "/";

const adminRouteChildren = [
  { index: true, element: <AdminDashboardPage /> },
  { path: "events", element: <AdminEventsPage /> },
  { path: "events/new", element: <AdminEventEditorPage /> },
  { path: "events/:eventId/edit", element: <AdminEventEditorPage /> },
  { path: "events/:eventId/participants", element: <AdminParticipantsPage /> },
  { path: "users", element: <AdminTablePage resource="users" title="Users" /> },
  { path: "sessions", element: <AdminTablePage resource="sessions" title="Sessions" /> },
  { path: "audit-logs", element: <AdminTablePage resource="audit-logs" title="Audit Logs" /> },
  { path: "*", element: <AdminNotFoundPage /> },
];

const mobileAppRoute = {
  path: "/",
  element: <MobileAppLayout />,
  errorElement: <NotFoundPage />,
  children: [
    { index: true, element: <RequireAuth><HomePage /></RequireAuth> },
    { path: "onboarding", element: <RequireAuth><OnboardingPage /></RequireAuth> },
    { path: "events", element: <RequireAuth><EventsPage /></RequireAuth> },
    { path: "events/:eventId", element: <RequireAuth><EventDetailPage /></RequireAuth> },
    { path: "events/:eventId/map", element: <RequireAuth><EventSubPage title="Map and Parking" /></RequireAuth> },
    { path: "events/:eventId/schedule", element: <RequireAuth><EventSubPage title="Schedule" /></RequireAuth> },
    { path: "events/:eventId/faq", element: <RequireAuth><EventSubPage title="FAQ" /></RequireAuth> },
    { path: "events/:eventId/feedback", element: <RequireAuth><EventSubPage title="Feedback" /></RequireAuth> },
    { path: "match", element: <RequireAuth><MatchPage /></RequireAuth> },
    { path: "teams", element: <RequireAuth><TeamsPage /></RequireAuth> },
    { path: "teams/:teamId", element: <RequireAuth><TeamDetailPage /></RequireAuth> },
    { path: "teams/:teamId/chat", element: <RequireAuth><TeamChatPage /></RequireAuth> },
    { path: "join-team/:token", element: <RequireAuth><JoinTeamPage /></RequireAuth> },
    { path: "chat/lobby", element: <RequireAuth><ChatPage title="Lobby" /></RequireAuth> },
    { path: "chat/support", element: <RequireAuth><ChatPage title="Support" /></RequireAuth> },
    { path: "chat/bot", element: <RequireAuth><ChatbotPage /></RequireAuth> },
    { path: "profile", element: <RequireAuth><ProfilePage /></RequireAuth> },
    { path: "settings", element: <RequireAuth><SettingsPage /></RequireAuth> },
    { path: "*", element: <NotFoundPage /> },
  ],
};

const authRoute = {
  path: "/",
  element: <AuthLayout />,
  errorElement: <AuthPage />,
  children: [
    { path: "login", element: <AuthPage /> },
    { path: "auth/callback", element: <AuthCallbackPage /> },
  ],
};

const standaloneAdminRoute = {
  path: "/",
  element: <RequireAdmin><AdminLayout /></RequireAdmin>,
  children: adminRouteChildren,
};

export const router = createBrowserRouter(
  isAdminContainer
    ? [
        { path: "/auth/callback", element: <AdminAuthCallbackPage /> },
        standaloneAdminRoute,
      ]
    : [
        { path: "/admin/*", element: <Navigate replace to={participantAdminRedirect} /> },
        authRoute,
        mobileAppRoute,
      ],
);

function AuthLayout() {
  return (
    <div className="native-stage">
      <div className="phone-shell auth-phone-shell">
        <main className="screen-shell standalone-screen auth-screen-shell">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function MobileAppLayout() {
  const { isAuthenticated, signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
    setIsUserMenuOpen(false);
  }

  return (
    <div className="native-stage">
      <div className="phone-shell">
        <header className="app-topbar">
          <Link className="app-brand" to="/" aria-label="Hackmate home">
            <img className="app-brand-mark" src="/brand/hackmate-logo.png" alt="" />
            <span>Hackmate</span>
          </Link>
          {isAuthenticated ? (
            <div className="topbar-user-wrap">
              <button
                className="topbar-user"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                type="button"
                aria-label="Open account menu"
                aria-expanded={isUserMenuOpen}
              >
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" />
                ) : (
                  <span>{getUserDisplayName(user).charAt(0)}</span>
                )}
              </button>
              {isUserMenuOpen ? (
                <div className="topbar-menu">
                  <Link to="/profile" onClick={() => setIsUserMenuOpen(false)}>
                    <i className="fa-solid fa-user" aria-hidden="true" /> Profile
                  </Link>
                  <button disabled={isSigningOut} onClick={handleSignOut} type="button">
                    <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> {isSigningOut ? "Signing out" : "Log out"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Link className="topbar-action" to="/login">
              Sign in
            </Link>
          )}
        </header>

        <main className="screen-shell">
          <Outlet />
        </main>

        <nav className="bottom-tabs" aria-label="Primary app navigation">
          {bottomTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `bottom-tab${isActive ? " is-active" : ""}`
              }
            >
              <span className="tab-mark" aria-hidden="true">
                <i className={tab.icon} />
              </span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function HomePage() {
  const [liveEventCount, setLiveEventCount] = useState(null);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    Promise.all([countLiveEvents(), listEvents(), listUserEventRegistrations(user.id)]).then(([countResult, eventsResult, registrationResult]) => {
      if (!isMounted) return;
      setLiveEventCount(countResult.count);
      setEvents(eventsResult.data ?? []);
      setRegistrations((registrationResult.data ?? []).filter((registration) => registration.status !== "Cancelled"));
    });

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  const now = Date.now();
  const joinedEvents = events.filter((event) => registrations.some((registration) => registration.event_id === event.id));
  const currentEvents = joinedEvents.filter((event) => new Date(event.starts_at).getTime() <= now && (!event.ends_at || new Date(event.ends_at).getTime() >= now));
  const upcomingEvents = events.filter((event) => new Date(event.starts_at).getTime() > now).slice(0, 3);

  return (
    <ScreenStack>
      <section className="home-hero-card native-card">
        <p className="card-label">Hackmate</p>
        <h1>Build with the right people.</h1>
        <p>Join an event, choose your team mode, then match with participants there.</p>
        <div className="home-action-row">
          <Link className="primary-action" to="/events">Choose event</Link>
          <Link className="secondary-action" to="/chat/lobby">Chat</Link>
        </div>
      </section>

      {joinedEvents.length > 0 ? (
        <section className="native-card compact-card home-event-stack">
          <p className="card-label">Joined</p>
          {(currentEvents.length ? currentEvents : joinedEvents).slice(0, 2).map((event) => (
            <HomeEventRow key={event.id} event={event} />
          ))}
        </section>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <section className="native-card compact-card home-event-stack">
          <p className="card-label">Upcoming</p>
          {upcomingEvents.map((event) => (
            <HomeEventRow key={event.id} event={event} />
          ))}
        </section>
      ) : null}

      <section className="quick-grid" aria-label="Quick actions">
        <QuickAction to="/events" label="Events" value={liveEventCount === null ? "Loading" : `${liveEventCount} live`} />
        <QuickAction to="/match" label="Match" value="Team" />
      </section>
    </ScreenStack>
  );
}

function HomeEventRow({ event }) {
  const date = formatDateParts(event.starts_at);

  return (
    <Link className="home-event-row" to={`/events/${event.id}`}>
      {event.logo_url ? <img src={event.logo_url} alt="" /> : <span>{event.name.charAt(0)}</span>}
      <div>
        <strong>{event.name}</strong>
        <small>{date.monthDay} · {date.time} · {event.location_name || "Location TBA"}</small>
      </div>
    </Link>
  );
}

function AuthPage() {
  const location = useLocation();
  const {
    error,
    isAuthenticated,
    isLoading,
    isSupabaseConfigured,
    signInWithProvider,
    signOut,
    user,
  } = useAuth();
  const [pendingProvider, setPendingProvider] = useState("");
  const redirectPath = getRedirectPath(location.state?.from, "/onboarding");

  async function handleProviderSignIn(provider) {
    setPendingProvider(provider);
    const { error: signInError } = await signInWithProvider(provider, redirectPath);

    if (signInError) {
      setPendingProvider("");
    }
  }

  async function handleSignOut() {
    setPendingProvider("signout");
    await signOut();
    setPendingProvider("");
  }

  if (isLoading) {
    return (
      <AuthStatusScreen
        eyebrow="Session"
        title="Checking your session."
        body="Hackmate is restoring your Supabase Auth session."
      />
    );
  }

  if (isAuthenticated) {
    return (
      <div className="login-page-stack">
        <section className="native-card action-card login-card">
          <p className="card-label">Signed in</p>
          <h1>You are ready to build.</h1>
          <p>Your Supabase session is active and protected app routes are unlocked.</p>
          <p className="auth-identity">
            <strong>{getUserDisplayName(user)}</strong>
            <span>{user?.email ?? "OAuth account"}</span>
          </p>
          <Link className="primary-action" to={redirectPath}>
            Continue to app
          </Link>
          <button
            className="secondary-action"
            disabled={pendingProvider === "signout"}
            onClick={handleSignOut}
            type="button"
          >
            {pendingProvider === "signout" ? "Signing out..." : "Sign out"}
          </button>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
        </section>
      </div>
    );
  }

  return (
    <div className="login-page-stack">
      <section className="native-card login-card">
        <Link className="auth-brand" to="/" aria-label="Hackmate home">
          <img className="app-brand-mark" src="/brand/hackmate-logo.png" alt="" />
          <span>Hackmate</span>
        </Link>
        <h1>Build your hackathon crew.</h1>
        <p>
          Sign in with GitHub to form teams, view events, chat live, and keep
          your event day one thumb away.
        </p>
        {!isSupabaseConfigured ? <SupabaseConfigNotice /> : null}
        <button
          className="primary-action auth-github-action"
          disabled={!isSupabaseConfigured || Boolean(pendingProvider)}
          onClick={() => handleProviderSignIn("github")}
          type="button"
        >
          {pendingProvider === "github" ? "Opening GitHub..." : "Sign up with GitHub"}
        </button>
        <p className="fine-print">
          First-time GitHub users are signed up automatically when Supabase Auth
          signups are enabled. Returning users are signed back in.
        </p>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}

function AuthCallbackPage() {
  const location = useLocation();
  const { error, isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();
  const flow = peekOAuthFlow();
  const nextPath = getSafeNextPath(new URLSearchParams(location.search).get("next"));
  const adminIntent = flow?.mode === "admin" ? null : consumeAdminOAuthIntent();

  if (adminIntent?.adminOrigin && adminIntent.adminOrigin !== window.location.origin) {
    const target = new URL("/auth/callback", adminIntent.adminOrigin);
    // Use the raw browser URL values instead of React Router's location so that
    // PKCE codes (?code=…) and implicit-flow hash tokens (#access_token=…) are
    // forwarded to the admin origin before the local Supabase client can
    // consume them.
    target.search = window.location.search;
    target.hash = window.location.hash;
    window.location.replace(target.toString());
    return null;
  }

  if (flow?.mode === "admin") {
    consumeOAuthFlow();
    window.location.replace(import.meta.env.VITE_ADMIN_BASE_URL || adminIntent?.adminOrigin || "/");
    return null;
  }

  if (!isSupabaseConfigured) {
    return (
      <AuthStatusScreen
        eyebrow="Setup"
        title="Supabase is not configured."
        body="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before completing OAuth sign in."
      />
    );
  }

  if (!isLoading && isAuthenticated) {
    consumeOAuthFlow();
    return <Navigate replace to={nextPath} />;
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="OAuth"
        title={isLoading ? "Finishing sign in." : "Sign in was not completed."}
        body="Hackmate is reading the Supabase Auth callback and restoring your session."
      />
      <section className="native-card action-card">
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        {!isLoading ? (
          <Link className="primary-action" to="/login">
            Try signing in again
          </Link>
        ) : null}
      </section>
    </ScreenStack>
  );
}

function RequireAuth({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();

  if (isLoading) {
    return (
      <AuthStatusScreen
        eyebrow="Session"
        title="Checking access."
        body="Protected Hackmate screens require an active Supabase session."
      />
    );
  }

  if (!isSupabaseConfigured) {
    return <SupabaseConfigNotice />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}

function AuthStatusScreen({ eyebrow, title, body }) {
  return (
    <ScreenStack>
      <ScreenHeader eyebrow={eyebrow} title={title} body={body} />
      <section className="native-card compact-card">
        <p>Secure account state is handled by Supabase Auth.</p>
      </section>
    </ScreenStack>
  );
}

function LoadingCard({ label, body }) {
  return (
    <section className="native-card compact-card">
      <p className="card-label">{label}</p>
      <p>{body}</p>
    </section>
  );
}

function EmptyCard({ title, body }) {
  return (
    <section className="native-card empty-state">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
    </section>
  );
}

function SupabaseConfigNotice() {
  return (
    <section className="native-card compact-card auth-warning" role="status">
      <p className="card-label">Configuration needed</p>
      <p>
        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>
        to a local <code>.env</code> file, then restart Vite.
      </p>
    </section>
  );
}


function OnboardingPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function saveTeamStatus(nextStatus) {
    setStatus(nextStatus);
    setMessage("");

    const baseProfile = buildDefaultProfile(user);
    const updates = {
      ...baseProfile,
      looking_for_team: nextStatus === "looking",
      open_to_joining_team: nextStatus === "looking",
    };

    const { error } = await upsertProfile(updates);

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    window.location.assign(nextStatus === "looking" ? "/match" : "/teams");
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Setup"
        title="What is your team status?"
        body="This choice controls the rest of the app. Swipe only appears for people or teams still looking for members."
      />

      <section className="choice-list" aria-label="Team status choices">
        <ChoiceButton
          title="I already have teammates"
          body="Create your team profile and skip the solo swipe pool."
          action={status === "teamed" ? "Saving..." : "Choose members"}
          disabled={status !== "idle"}
          onClick={() => saveTeamStatus("teamed")}
        />
        <ChoiceButton
          title="I am looking for a team"
          body="Enter the eligible matching pool for teams and solo builders."
          action={status === "looking" ? "Saving..." : "Find a team"}
          disabled={status !== "idle"}
          onClick={() => saveTeamStatus("looking")}
        />
        <ChoiceButton
          title="My team needs people"
          body="Set up your profile now, then turn on recruiting from the team screen."
          action={status === "recruiting" ? "Saving..." : "Recruit members"}
          disabled={status !== "idle"}
          onClick={() => saveTeamStatus("recruiting")}
        />
      </section>
      {message ? <p className="auth-error" role="alert">{message}</p> : null}
    </ScreenStack>
  );
}

function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [savingEventId, setSavingEventId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setStatus("loading");
      const [eventResult, registrationResult] = await Promise.all([
        listEvents(),
        listUserEventRegistrations(user.id),
      ]);

      if (!isMounted) return;

      if (eventResult.error || registrationResult.error) {
        setMessage(eventResult.error?.message ?? registrationResult.error?.message ?? "Events unavailable.");
        setEvents([]);
      } else {
        setEvents(eventResult.data);
        setRegistrations(registrationResult.data);
        setMessage("");
      }

      setStatus("idle");
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  async function handleRegister(eventId) {
    setSavingEventId(eventId);
    setMessage("");

    const { data, error } = await registerForEvent(eventId, user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setRegistrations((current) => [
        data ?? { event_id: eventId, user_id: user.id, status: "Registered" },
        ...current.filter((registration) => registration.event_id !== eventId),
      ]);
      window.location.assign("/onboarding");
    }

    setSavingEventId("");
  }

  async function handleLeave(eventId) {
    setSavingEventId(eventId);
    setMessage("");

    const { data, error } = await leaveEvent(eventId, user.id);

    if (error) {
      setMessage(error.message);
    } else {
      setRegistrations((current) => [
        data ?? { event_id: eventId, user_id: user.id, status: "Cancelled" },
        ...current.filter((registration) => registration.event_id !== eventId),
      ]);
    }

    setSavingEventId("");
  }

  const activeRegistrations = registrations.filter((registration) => registration.status !== "Cancelled");
  const registeredEventIds = new Set(activeRegistrations.map((registration) => registration.event_id));
  const selectedEvent = events.find((event) => registeredEventIds.has(event.id));
  const filteredEvents = events.filter((event) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${event.name} ${event.location_name ?? ""} ${event.description ?? ""}`.toLowerCase().includes(query);
  });

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Events"
        title="Choose your event."
        body="Pick the hackathon you are joining. Team setup starts right after registration."
      />

      <input
        className="event-search"
        placeholder="Search events"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {status === "loading" ? <LoadingCard label="Events" body="Loading upcoming hackathons." /> : null}
      {message ? <EmptyCard title="Events unavailable" body={message} /> : null}
      {status !== "loading" && !message && events.length === 0 ? (
        <EmptyCard
          title="No events yet."
          body="Admin-created hackathons will appear here when registration opens."
        />
      ) : null}
      {filteredEvents.length > 0 ? (
        <div className="event-list">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isRegistered={registeredEventIds.has(event.id)}
              isSaving={savingEventId === event.id}
              onLeave={handleLeave}
              onRegister={handleRegister}
            />
          ))}
        </div>
      ) : null}
    </ScreenStack>
  );
}

function EventCard({ event, isRegistered, isSaving, onLeave, onRegister }) {
  const startsAt = formatDateParts(event.starts_at);
  const endsAt = event.ends_at ? formatDateParts(event.ends_at) : null;
  const artwork = event.cover_url || event.banner_url;

  return (
    <article className={`event-showcase-card${isRegistered ? " is-selected" : ""}`}>
      {artwork ? <img className="event-card-cover" src={artwork} alt="" /> : null}
      <Link className="event-showcase-main" to={`/events/${event.id}`}>
        {event.logo_url ? <img className="event-logo" src={event.logo_url} alt="" /> : null}
        <span className="event-date">
          <strong>{startsAt.weekday}</strong>
          <span>{startsAt.monthDay}</span>
        </span>
        <span className="event-main">
          <span className="status-pill">{isRegistered ? "Registered" : formatStatus(event.registration_status)}</span>
          <strong>{event.name}</strong>
          <span>{startsAt.time}{endsAt ? ` - ${endsAt.time}` : ""}</span>
          <span>{event.location_name || "Location TBA"}</span>
        </span>
      </Link>
      <button
        className={isRegistered ? "secondary-action" : "primary-action"}
        disabled={isSaving || (!isRegistered && event.registration_status === "closed")}
        onClick={() => isRegistered ? onLeave(event.id) : onRegister(event.id)}
        type="button"
      >
        {isRegistered ? (isSaving ? "Leaving..." : "Leave event") : isSaving ? "Joining..." : "Join event"}
      </button>
    </article>
  );
}

function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvent() {
      setStatus("loading");
      const [{ data, error }, announcementResult] = await Promise.all([
        getEvent(eventId),
        getEventAnnouncements(eventId),
      ]);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
      } else if (!data) {
        setMessage("This event was not found or is not available yet.");
      } else {
        setEvent(data);
        setAnnouncements(announcementResult.data ?? []);
        setMessage(announcementResult.error?.message ?? "");
      }

      setStatus("idle");
    }

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return undefined;

    return subscribeToEventAnnouncements(eventId, async () => {
      const { data } = await getEventAnnouncements(eventId);
      setAnnouncements(data ?? []);
    });
  }, [eventId]);

  if (status === "loading") {
    return <LoadingCard label="Event" body="Loading event details." />;
  }

  if (message && !event) {
    return <EmptyCard title="Event unavailable" body={message} />;
  }

  const startsAt = formatFullDate(event.starts_at);

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Event"
        title={event.name}
        body={event.description || "Everything participants need during the event: schedule, map, parking, FAQs, announcements, and feedback."}
      />

      <section className="event-hero native-card">
        <p className="card-label">{formatStatus(event.registration_status)}</p>
        <h2>{startsAt}</h2>
        <p>{event.location_name || "Location TBA"}</p>
        {event.address ? <p className="fine-print">{event.address}</p> : null}
        <div className="chip-row">
          {event.capacity ? <span>{event.capacity} spots</span> : null}
          {event.ends_at ? <span>Ends {formatFullDate(event.ends_at)}</span> : null}
        </div>
      </section>

      {announcements.length > 0 ? (
        <section className="native-card event-section">
          <p className="card-label">Announcements</p>
          {announcements.map((announcement) => (
            <article className="detail-item" key={announcement.id}>
              <strong>{announcement.title}</strong>
              <p>{announcement.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      <div className="menu-list" aria-label="Event sections">
        <MenuRow to="map" title="Map and parking" detail="Venue, parking, entrances" />
        <MenuRow to="schedule" title="Schedule" detail="Talks, food, judging" />
        <MenuRow to="faq" title="FAQ" detail="Rules, hours, restrictions" />
        <MenuRow to={`/chat/bot?event=${event.id}`} title="Ask bot" detail="FAQ, schedule, location" />
        <MenuRow to="feedback" title="Feedback" detail="Post-event survey" />
      </div>
    </ScreenStack>
  );
}

function EventSubPage({ title }) {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [roomAreas, setRoomAreas] = useState([]);
  const [form, setForm] = useState({ overall_rating: "", comments: "", anonymous: false, would_attend_again: false });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSubPage() {
      setStatus("loading");
      const eventResult = await getEvent(eventId);
      let itemResult = { data: [], error: null };
      let markerResult = { data: [], error: null };
      let areaResult = { data: [], error: null };

      if (title === "FAQ") itemResult = await getEventFaqs(eventId);
      if (title === "Schedule") itemResult = await getEventSchedule(eventId);
      if (title === "Map and Parking") {
        [markerResult, areaResult] = await Promise.all([
          getEventMapMarkers(eventId),
          getEventRoomAreas(eventId),
        ]);
      }

      if (!isMounted) return;

      if (eventResult.error) {
        setMessage(eventResult.error.message);
      } else if (!eventResult.data) {
        setMessage("This event was not found or is not available yet.");
      } else if (itemResult.error) {
        setEvent(eventResult.data);
        setMessage(itemResult.error.message);
      } else if (markerResult.error || areaResult.error) {
        setEvent(eventResult.data);
        setMessage(markerResult.error?.message ?? areaResult.error?.message ?? "");
      } else {
        setEvent(eventResult.data);
        setItems(itemResult.data ?? []);
        setMapMarkers(markerResult.data ?? []);
        setRoomAreas(areaResult.data ?? []);
        setMessage("");
      }

      setStatus("idle");
    }

    loadSubPage();

    return () => {
      isMounted = false;
    };
  }, [eventId, title]);

  async function submitFeedback(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const { error } = await upsertFeedback({
      event_id: eventId,
      user_id: user.id,
      overall_rating: Number(form.overall_rating),
      comments: form.comments.trim() || null,
      anonymous: form.anonymous,
      would_attend_again: form.would_attend_again,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Feedback saved.");
    }

    setStatus("idle");
  }

  if (status === "loading") {
    return <LoadingCard label={title} body="Loading event content." />;
  }

  if (message && !event) {
    return <EmptyCard title={`${title} unavailable`} body={message} />;
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow={event?.name ?? formatRouteLabel(eventId)}
        title={title}
        body={getEventSubPageBody(title)}
      />
      {title === "Map and Parking" ? <MapAndParking event={event} markers={mapMarkers} roomAreas={roomAreas} /> : null}
      {title === "Schedule" ? <ScheduleList items={items} /> : null}
      {title === "FAQ" ? <FaqList items={items} /> : null}
      {title === "Feedback" ? (
        <form className="native-card profile-form" onSubmit={submitFeedback}>
          <Field label="Overall rating" htmlFor="overallRating">
            <select
              id="overallRating"
              required
              value={form.overall_rating}
              onChange={(event) => setForm((current) => ({ ...current, overall_rating: event.target.value }))}
            >
              <option value="">Choose rating</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Okay</option>
              <option value="2">2 - Needs work</option>
              <option value="1">1 - Poor</option>
            </select>
          </Field>
          <Field label="Comments" htmlFor="feedbackComments">
            <textarea
              id="feedbackComments"
              rows="4"
              value={form.comments}
              onChange={(event) => setForm((current) => ({ ...current, comments: event.target.value }))}
            />
          </Field>
          <label className="check-row">
            <input
              checked={form.would_attend_again}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, would_attend_again: event.target.checked }))}
            />
            <span>I would attend again.</span>
          </label>
          <label className="check-row">
            <input
              checked={form.anonymous}
              type="checkbox"
              onChange={(event) => setForm((current) => ({ ...current, anonymous: event.target.checked }))}
            />
            <span>Submit anonymously to organizers.</span>
          </label>
          <button className="primary-action" disabled={status === "saving"} type="submit">
            {status === "saving" ? "Saving..." : "Submit feedback"}
          </button>
          {message ? <p className={message === "Feedback saved." ? "form-success" : "auth-error"}>{message}</p> : null}
        </form>
      ) : null}
    </ScreenStack>
  );
}

function MapAndParking({ event, markers, roomAreas }) {
  const hasCoordinates = event?.latitude && event?.longitude;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`
    : null;
  const parkingMarkers = markers.filter((marker) => marker.marker_type === "parking");
  const nonParkingMarkers = markers.filter((marker) => marker.marker_type !== "parking");

  return (
    <>
      <section className="native-card event-section">
        <p className="card-label">Interactive venue map</p>
        <h2>{event?.location_name || "Location TBA"}</h2>
        {event?.address ? <p>{event.address}</p> : <p>Address details will appear when organizers publish them.</p>}
        <Suspense fallback={<LoadingCard label="Map" body="Loading OpenStreetMap." />}>
          <EventMap event={event} markers={markers} />
        </Suspense>
        {mapUrl ? (
          <a className="primary-action" href={mapUrl} rel="noreferrer" target="_blank">
            Open in OpenStreetMap
          </a>
        ) : null}
      </section>

      {markers.length > 0 ? (
        <section className="native-card event-section">
          <p className="card-label">Map markers</p>
          {[...nonParkingMarkers, ...parkingMarkers].map((marker) => (
            <article className="detail-item" key={marker.id}>
              <strong>{marker.label}</strong>
              <p>{formatStatus(marker.marker_type)}{marker.floor ? ` • Floor ${marker.floor}` : ""}</p>
              {marker.description ? <p>{marker.description}</p> : null}
            </article>
          ))}
        </section>
      ) : null}

      {roomAreas.length > 0 ? (
        <section className="native-card event-section">
          <p className="card-label">Room layout</p>
          {roomAreas.map((area) => (
            <article className="detail-item" key={area.id}>
              <strong>{area.name}</strong>
              <p>{formatStatus(area.area_type)}{area.floor ? ` • Floor ${area.floor}` : ""}</p>
              {area.description ? <p>{area.description}</p> : null}
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}

function ScheduleList({ items }) {
  if (items.length === 0) {
    return <EmptyCard title="No schedule yet." body="Talks, food, judging, and workshop times will appear here." />;
  }

  return (
    <section className="native-card event-section">
      {items.map((item) => (
        <article className="detail-item" key={item.id}>
          <p className="card-label">{item.category || "Schedule"}</p>
          <strong>{item.title}</strong>
          <p>{formatTimeRange(item.starts_at, item.ends_at)}{item.location ? ` at ${item.location}` : ""}</p>
          {item.description ? <p>{item.description}</p> : null}
          {item.speaker_or_host ? <p className="fine-print">Hosted by {item.speaker_or_host}</p> : null}
        </article>
      ))}
    </section>
  );
}

function FaqList({ items }) {
  if (items.length === 0) {
    return <EmptyCard title="No FAQs yet." body="Rules, restrictions, hours, and event answers will appear here." />;
  }

  return (
    <section className="native-card event-section">
      {items.map((item) => (
        <article className="detail-item" key={item.id}>
          <p className="card-label">{item.category || "FAQ"}</p>
          <strong>{item.question}</strong>
          <p>{item.answer}</p>
        </article>
      ))}
    </section>
  );
}

function MatchPage() {
  const { user } = useAuth();
  const [actors, setActors] = useState([]);
  const [actorIndex, setActorIndex] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  const actor = actors[actorIndex] ?? null;
  const candidate = candidates[candidateIndex] ?? null;

  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      setStatus("loading");
      const { data, error } = await getMatchingContext(user.id);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setActors([]);
      } else {
        setActors(data.actors);
        setSelectedEventId(data.selectedEventId);
        setMessage("");
      }

      setStatus("idle");
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidates() {
      if (!actor) {
        setCandidates([]);
        return;
      }

      setStatus("loading-candidates");
      const { data, error } = await listCandidates(actor, user.id, selectedEventId);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setCandidates([]);
      } else {
        setCandidates(data);
        setCandidateIndex(0);
        setMessage("");
      }

      setStatus("idle");
    }

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, [actor, selectedEventId, user.id]);

  async function handleSwipe(direction) {
    if (!actor || !candidate) return;

    setStatus("saving");
    setMessage("");
    const { error } = await createSwipe(actor, candidate, direction);

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    setCandidateIndex((current) => current + 1);
    setActiveCandidate(null);
    setStatus("idle");
  }

  function handleOpenCandidate(candidateToOpen) {
    setActiveCandidate(candidateToOpen);
  }

  return (
    <ScreenStack>
      <section className="match-top-card">
        <p className="card-label">Match</p>
        <h1>Find your crew.</h1>
        <p>Swipe right on people or recruiting teams you want to build with. Swipe left to keep looking.</p>
      </section>

      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      {actors.length > 1 ? (
        <section className="native-card compact-card">
          <Field label="Matching as" htmlFor="matchActor">
            <select
              id="matchActor"
              value={actorIndex}
              onChange={(event) => setActorIndex(Number(event.target.value))}
            >
              {actors.map((option, index) => (
                <option key={`${option.type}-${option.id}`} value={index}>{option.label}</option>
              ))}
            </select>
          </Field>
        </section>
      ) : null}
      {status === "loading" || status === "loading-candidates" ? (
        <LoadingCard label="Match" body="Loading eligible matches." />
      ) : null}
      {status === "idle" && actors.length === 0 ? (
        <EmptyCard
          title="Matching is locked."
          body={selectedEventId ? "Mark yourself as looking for a team or set one of your teams to recruiting before swiping." : "Register for an event first, then come back here to match with participants from that hackathon."}
        />
      ) : null}
      {status === "idle" && actor && !candidate ? (
        <EmptyCard
          title="No candidates right now."
          body="Invite more builders to set themselves as looking for a team, or create a recruiting team so Hackmate can suggest more matches."
        />
      ) : null}
      {candidate ? (
        <MatchCard
          actor={actor}
          candidate={candidate}
          disabled={status === "saving"}
          onOpen={handleOpenCandidate}
          onSwipe={handleSwipe}
        />
      ) : null}
      {activeCandidate ? (
        <CandidateDetailSheet candidate={activeCandidate} onClose={() => setActiveCandidate(null)} />
      ) : null}

      {!selectedEventId ? (
        <Link className="primary-action" to="/events">Choose an event</Link>
      ) : null}
    </ScreenStack>
  );
}

function MatchCard({ actor, candidate, disabled, onOpen, onSwipe }) {
  const [dragStart, setDragStart] = useState(null);
  const isTeam = candidate.type === "team";
  const title = isTeam ? candidate.team.name : candidate.profile.display_name;
  const body = isTeam
    ? candidate.team.project_idea || candidate.team.description || "Recruiting team looking for builders."
    : candidate.profile.bio || "Solo participant looking for a team.";
  const initial = title?.charAt(0) || "?";

  function handlePointerDown(event) {
    setDragStart({ x: event.clientX, y: event.clientY });
  }

  function handlePointerUp(event) {
    if (!dragStart || disabled) return;

    const deltaX = event.clientX - dragStart.x;
    const deltaY = event.clientY - dragStart.y;
    setDragStart(null);

    if (Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      onSwipe(deltaX > 0 ? "right" : "left");
    }
  }

  return (
    <section
      className="swipe-card tinder-card"
      aria-label={`${title} match card`}
      onClick={() => onOpen(candidate)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="swipe-card-top">
        {candidate.profile?.avatar_url ? (
          <img className="avatar-circle" src={candidate.profile.avatar_url} alt="" />
        ) : (
          <span className="avatar-circle">{initial}</span>
        )}
        <span className="status-pill">{isTeam ? "Recruiting team" : "Looking for team"}</span>
      </div>
      <div className="swipe-card-content">
        <p className="card-label">{actor.type === "team" ? `For ${actor.label}` : "For you"}</p>
        <h2>{title}</h2>
        <p>{body}</p>
        <div className="chip-row">
          {isTeam && candidate.team.events?.name ? <span>{candidate.team.events.name}</span> : null}
          {isTeam && candidate.team.github_url ? <span>GitHub</span> : null}
          {!isTeam && candidate.profile.desired_role ? <span>{candidate.profile.desired_role}</span> : null}
          {!isTeam && candidate.profile.experience_level ? <span>{candidate.profile.experience_level}</span> : null}
          {!isTeam && candidate.profile.availability ? <span>{candidate.profile.availability}</span> : null}
        </div>
      </div>
      <div className="swipe-actions" aria-label="Swipe actions">
        <button className="round-action reject" disabled={disabled} onClick={(event) => { event.stopPropagation(); onSwipe("left"); }} type="button" aria-label="Skip profile">
          ×
        </button>
        <button className="round-action accept" disabled={disabled} onClick={(event) => { event.stopPropagation(); onSwipe("right"); }} type="button" aria-label="Express interest">
          ♥
        </button>
      </div>
    </section>
  );
}

function CandidateDetailSheet({ candidate, onClose }) {
  const isTeam = candidate.type === "team";
  const title = isTeam ? candidate.team.name : candidate.profile.display_name;
  const links = isTeam
    ? [
        ["GitHub", candidate.team.github_url],
        ["Devpost", candidate.team.devpost_url],
      ]
    : [
        ["GitHub", candidate.profile.github_url],
        ["LinkedIn", candidate.profile.linkedin_url],
        ["Devpost", candidate.profile.devpost_url],
      ];

  return (
    <section className="native-card candidate-detail-sheet">
      <div className="sheet-header-row">
        <div>
          <p className="card-label">Profile</p>
          <h2>{title}</h2>
        </div>
        <button className="secondary-action" onClick={onClose} type="button">Close</button>
      </div>
      <p>{isTeam ? candidate.team.description || candidate.team.project_idea : candidate.profile.bio || "No bio yet."}</p>
      <div className="profile-link-grid">
        {links.filter(([, href]) => href).map(([label, href]) => (
          <a className="secondary-action" href={href} key={label} rel="noreferrer" target="_blank">{label}</a>
        ))}
      </div>
    </section>
  );
}

function TeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ event_id: "", name: "", description: "", project_idea: "", role: "Team lead", recruiting_members: false });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      setStatus("loading");
      const [teamResult, eventResult] = await Promise.all([listUserTeams(user.id), listEvents()]);

      if (!isMounted) return;

      setTeams(teamResult.data ?? []);
      setEvents(eventResult.data ?? []);
      setMessage(teamResult.error?.message || eventResult.error?.message || "");
      setStatus("idle");
    }

    loadTeams();

    return () => {
      isMounted = false;
    };
  }, [user.id]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateTeam(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const { data, error } = await createTeam({
      userId: user.id,
      role: form.role,
      team: {
        event_id: form.event_id,
        name: form.name.trim(),
        description: emptyToNull(form.description),
        project_idea: emptyToNull(form.project_idea),
        recruiting_members: form.recruiting_members,
      },
    });

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    window.location.assign(`/teams/${data.id}`);
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Team"
        title="Set your team before you swipe."
        body="Add existing members, request to join by QR, or mark your team as recruiting."
      />

      {message ? <p className="auth-error" role="alert">{message}</p> : null}
      {status === "loading" ? <LoadingCard label="Teams" body="Loading your teams." /> : null}
      {teams.length > 0 ? (
        <section className="choice-list" aria-label="Your teams">
          {teams.map((team) => (
            <ChoiceCard
              key={team.id}
              title={team.name}
              body={`${team.events?.name ?? "Event"} · ${team.recruiting_members ? "Recruiting" : "Complete or private"}`}
              action="Open"
              to={`/teams/${team.id}`}
            />
          ))}
        </section>
      ) : status !== "loading" ? (
        <EmptyCard title="No team yet." body="Create a team for an event, then invite or approve teammates in later build steps." />
      ) : null}

      <form className="native-card profile-form" onSubmit={handleCreateTeam}>
        <p className="card-label">Create team</p>
        <Field label="Event" htmlFor="teamEvent">
          <select id="teamEvent" required value={form.event_id} onChange={(event) => updateForm("event_id", event.target.value)}>
            <option value="">Choose event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Team name" htmlFor="teamName">
          <input id="teamName" required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
        </Field>
        <Field label="Your team role" htmlFor="teamRole">
          <input id="teamRole" value={form.role} onChange={(event) => updateForm("role", event.target.value)} />
        </Field>
        <Field label="Project idea" htmlFor="teamProject">
          <textarea id="teamProject" rows="3" value={form.project_idea} onChange={(event) => updateForm("project_idea", event.target.value)} />
        </Field>
        <Field label="Team description" htmlFor="teamDescription">
          <textarea id="teamDescription" rows="3" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
        </Field>
        <label className="check-row">
          <input checked={form.recruiting_members} type="checkbox" onChange={(event) => updateForm("recruiting_members", event.target.checked)} />
          <span>This team is recruiting members.</span>
        </label>
        <button className="primary-action" disabled={status === "saving" || events.length === 0} type="submit">
          {status === "saving" ? "Creating..." : "Create team"}
        </button>
      </form>
    </ScreenStack>
  );
}

function TeamDetailPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", project_idea: "", github_url: "", devpost_url: "", recruiting_members: false });
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTeam() {
      setStatus("loading");
      const { data, error } = await getTeam(teamId);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
      } else if (!data) {
        setMessage("This team was not found or you do not have access.");
      } else {
        setTeam(data);
        setForm(teamToForm(data));
        setMessage("");
      }

      setStatus("idle");
    }

    loadTeam();

    return () => {
      isMounted = false;
    };
  }, [teamId]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const { data, error } = await updateTeam(teamId, formToTeam(form));

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    setTeam((current) => ({ ...current, ...data }));
    setMessage("Team saved.");
    setStatus("idle");
  }

  async function handleCreateInvite() {
    setStatus("creating-invite");
    setMessage("");

    const { data, error } = await createTeamJoinToken(teamId, user.id);

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    setInvite({
      url: `${window.location.origin}/join-team/${data.token}`,
      expires_at: data.expires_at,
    });
    setStatus("idle");
  }

  if (status === "loading") {
    return <LoadingCard label="Team" body="Loading team profile." />;
  }

  if (message && !team) {
    return <EmptyCard title="Team unavailable" body={message} />;
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Team"
        title={team.name}
        body={team.description || "Team profile, members, project links, and recruiting state."}
      />
      <section className="native-card event-section">
        <p className="card-label">{team.events?.name ?? "Event"}</p>
        <h2>{team.project_idea || "Project idea TBA"}</h2>
        <div className="chip-row">
          <span>{team.recruiting_members ? "Recruiting members" : "Not recruiting"}</span>
          {team.github_url ? <span>GitHub linked</span> : null}
          {team.devpost_url ? <span>Devpost linked</span> : null}
        </div>
      </section>
      <section className="native-card event-section">
        <p className="card-label">Members</p>
        <div className="member-stack">
          {(team.team_members ?? []).map((member) => (
            <span className="member-pill" key={member.id}>
              {member.profiles?.display_name ?? "Team member"}{member.role ? ` · ${member.role}` : ""}
            </span>
          ))}
        </div>
      </section>
      <section className="native-card event-section">
        <p className="card-label">QR invite</p>
        <h2>Invite by link or QR.</h2>
        <p>Generate a one-week join link. Teammates scan or open it, then submit a request for approval.</p>
        <button className="secondary-action" disabled={status === "creating-invite"} onClick={handleCreateInvite} type="button">
          {status === "creating-invite" ? "Generating..." : "Generate join link"}
        </button>
        {invite ? (
          <div className="qr-preview">
            <img alt="Team join QR code" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(invite.url)}`} />
            <p className="fine-print">{invite.url}</p>
            <p className="fine-print">Expires {formatFullDate(invite.expires_at)}</p>
          </div>
        ) : null}
      </section>
      <form className="native-card profile-form" onSubmit={handleSave}>
        <p className="card-label">Edit team</p>
        <Field label="Team name" htmlFor="editTeamName">
          <input id="editTeamName" required value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
        </Field>
        <Field label="Project idea" htmlFor="editTeamProject">
          <textarea id="editTeamProject" rows="3" value={form.project_idea} onChange={(event) => updateForm("project_idea", event.target.value)} />
        </Field>
        <Field label="Description" htmlFor="editTeamDescription">
          <textarea id="editTeamDescription" rows="3" value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
        </Field>
        <div className="form-grid">
          <Field label="GitHub URL" htmlFor="editTeamGithub">
            <input id="editTeamGithub" inputMode="url" value={form.github_url} onChange={(event) => updateForm("github_url", event.target.value)} />
          </Field>
          <Field label="Devpost URL" htmlFor="editTeamDevpost">
            <input id="editTeamDevpost" inputMode="url" value={form.devpost_url} onChange={(event) => updateForm("devpost_url", event.target.value)} />
          </Field>
        </div>
        <label className="check-row">
          <input checked={form.recruiting_members} type="checkbox" onChange={(event) => updateForm("recruiting_members", event.target.checked)} />
          <span>This team is recruiting members.</span>
        </label>
        <button className="primary-action" disabled={status === "saving"} type="submit">
          {status === "saving" ? "Saving..." : "Save team"}
        </button>
        {message ? <p className={message === "Team saved." ? "form-success" : "auth-error"}>{message}</p> : null}
      </form>
      <MenuRow to="chat" title="Team channel" detail="Members only" />
    </ScreenStack>
  );
}

function TeamChatPage() {
  const { teamId } = useParams();

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Team chat"
        title={formatRouteLabel(teamId)}
        body="Approved team members will use this private realtime channel."
      />
      <ChatRoom teamId={teamId} title="Team channel" type="team" />
    </ScreenStack>
  );
}

function JoinTeamPage() {
  const { token } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadInvite() {
      setStatus("loading");
      const { data, error } = await getTeamByJoinToken(token);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
      } else if (!data?.team) {
        setMessage("This join link is invalid or expired.");
      } else {
        setTeam(data.team);
        setMessage("");
      }

      setStatus("idle");
    }

    loadInvite();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleJoinRequest() {
    if (!team) return;

    setStatus("saving");
    setMessage("");
    const { error } = await createJoinRequest({
      teamId: team.id,
      userId: user.id,
      message: note,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Join request sent. The team lead can approve you in a later team-management step.");
    }

    setStatus("idle");
  }

  if (status === "loading") {
    return <LoadingCard label="QR join" body="Checking this team invite." />;
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="QR join"
        title={team ? `Join ${team.name}?` : "Invite unavailable"}
        body={team ? "Confirm the request and wait for the team lead to approve access." : "Ask the team lead for a fresh QR invite."}
      />
      <section className="native-card action-card">
        {team ? (
          <>
            <p className="card-label">{team.events?.name ?? "Team invite"}</p>
            <h2>{team.project_idea || team.description || "Team details"}</h2>
            <Field label="Message to team lead" htmlFor="joinMessage">
              <textarea id="joinMessage" rows="3" value={note} onChange={(event) => setNote(event.target.value)} />
            </Field>
            <button className="primary-action" disabled={status === "saving"} onClick={handleJoinRequest} type="button">
              {status === "saving" ? "Sending..." : "Send join request"}
            </button>
          </>
        ) : null}
        {message ? <p className={message.startsWith("Join request") ? "form-success" : "auth-error"}>{message}</p> : null}
      </section>
    </ScreenStack>
  );
}

function ChatPage({ title }) {
  const type = title.toLowerCase();

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Chat"
        title={title}
        body="Fast, focused conversations for the lobby, teams, and organizer support."
      />
      <section className="native-card compact-card chat-command-strip">
        <Link className="secondary-action" to="/chat/bot">
          Ask Hackmate Bot
        </Link>
        {type === "support" ? (
          <Link className="secondary-action" to="/chat/lobby">
            Open lobby
          </Link>
        ) : (
          <Link className="secondary-action" to="/chat/support">
            Organizer support
          </Link>
        )}
      </section>
      <EventChatRoom title={type === "support" ? "Organizer support" : title} type={type} />
    </ScreenStack>
  );
}

function ChatbotPage() {
  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Assistant"
        title="Ask Hackmate Bot."
        body="Get event answers from published FAQs, schedules, maps, announcements, and registration data."
      />
      <EventChatbot />
    </ScreenStack>
  );
}

function ProfilePage() {
  const { role, user } = useAuth();
  const [form, setForm] = useState(() => profileToForm(buildDefaultProfile(user)));
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setStatus("loading");
      const { data, error } = await getProfile(user.id);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setStatus("idle");
        return;
      }

      setForm(profileToForm(data ?? buildDefaultProfile(user)));
      setStatus("idle");
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const { error } = await upsertProfile(formToProfile(form, user));

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    setMessage("Profile saved.");
    setStatus("idle");
  }

  const displayName = form.display_name || getUserDisplayName(user);
  const avatarUrl = form.avatar_url || user?.user_metadata?.avatar_url;

  return (
    <ScreenStack>
      <section className="profile-summary-card">
        <div className="profile-summary-top">
          {avatarUrl ? (
            <img className="profile-avatar" src={avatarUrl} alt="" />
          ) : (
            <span className="profile-avatar">{displayName.charAt(0)}</span>
          )}
          <div>
            <p className="card-label">Profile</p>
            <h1>{displayName}</h1>
            <p>{form.desired_role || "Add your role"} · {form.experience_level || "Experience TBA"}</p>
          </div>
        </div>
        <p>{form.bio || "Add a short intro so teams know what you want to build."}</p>
        <div className="profile-link-grid">
          <ProfileLink label="GitHub" href={form.github_url} />
          <ProfileLink label="LinkedIn" href={form.linkedin_url} />
          <ProfileLink label="Devpost" href={form.devpost_url} />
        </div>
      </section>
      <form className="native-card profile-form compact-profile-form" onSubmit={handleSubmit}>
        <p className="card-label">Edit details</p>
        <Field label="Display name" htmlFor="displayName">
          <input
            id="displayName"
            required
            value={form.display_name}
            onChange={(event) => updateField("display_name", event.target.value)}
          />
        </Field>
        <Field label="Bio" htmlFor="bio">
          <textarea
            id="bio"
            rows="4"
            value={form.bio}
            onChange={(event) => updateField("bio", event.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Desired role" htmlFor="desiredRole">
            <input
              id="desiredRole"
              placeholder="Frontend, backend, designer..."
              value={form.desired_role}
              onChange={(event) => updateField("desired_role", event.target.value)}
            />
          </Field>
          <Field label="Experience" htmlFor="experienceLevel">
            <select
              id="experienceLevel"
              value={form.experience_level}
              onChange={(event) => updateField("experience_level", event.target.value)}
            >
              <option value="">Choose level</option>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Expert</option>
            </select>
          </Field>
        </div>
        <Field label="Availability" htmlFor="availability">
          <input
            id="availability"
            placeholder="All weekend, evenings only..."
            value={form.availability}
            onChange={(event) => updateField("availability", event.target.value)}
          />
        </Field>
        <FeaturedSkillsEditor skills={form.featured_skills} onChange={(skills) => updateField("featured_skills", skills)} />
        <section className="profile-form-section">
          <p className="card-label">Social links</p>
          <Field label="GitHub" htmlFor="githubUrl">
            <input
              id="githubUrl"
              inputMode="url"
              value={form.github_url}
              onChange={(event) => updateField("github_url", event.target.value)}
            />
          </Field>
          <Field label="LinkedIn" htmlFor="linkedinUrl">
            <input
              id="linkedinUrl"
              inputMode="url"
              value={form.linkedin_url}
              onChange={(event) => updateField("linkedin_url", event.target.value)}
            />
          </Field>
          <Field label="Devpost" htmlFor="devpostUrl">
            <input
              id="devpostUrl"
              inputMode="url"
              value={form.devpost_url}
              onChange={(event) => updateField("devpost_url", event.target.value)}
            />
          </Field>
        </section>
        <button className="primary-action" disabled={status === "saving" || status === "loading"} type="submit">
          {status === "saving" ? "Saving..." : "Save profile"}
        </button>
        {message ? (
          <p className={message === "Profile saved." ? "form-success" : "auth-error"} role="status">
            {message}
          </p>
        ) : null}
      </form>
    </ScreenStack>
  );
}

function SettingsPage() {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Settings"
        title="Control your account."
        body="Manage the active Supabase session for this browser. Notification and privacy settings come later."
      />
      <section className="native-card action-card">
        <p className="auth-identity">
          <strong>{getUserDisplayName(user)}</strong>
          <span>{user?.email ?? "OAuth account"}</span>
        </p>
        <button
          className="secondary-action"
          disabled={isSigningOut}
          onClick={handleSignOut}
          type="button"
        >
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </section>
    </ScreenStack>
  );
}

function ScreenStack({ children }) {
  return <div className="screen-stack">{children}</div>;
}

function ScreenHeader({ eyebrow, title, body }) {
  return (
    <header className="screen-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </header>
  );
}

function QuickAction({ to, label, value }) {
  return (
    <Link className="quick-action" to={to}>
      <span>{label}</span>
      <strong>{value}</strong>
    </Link>
  );
}

function ProfileLink({ href, label }) {
  if (!href) return <span className="profile-link is-empty">{label}</span>;

  return (
    <a className="profile-link" href={href} rel="noreferrer" target="_blank">
      <span aria-hidden="true">{getSocialIcon(label)}</span>
      {label}
    </a>
  );
}

function FeaturedSkillsEditor({ skills = [], onChange }) {
  const levels = ["Beginner", "Advanced", "Professional"];
  const normalizedSkills = skills.length ? skills : [{ name: "", level: "Beginner" }];

  function updateSkill(index, field, value) {
    onChange(normalizedSkills.map((skill, skillIndex) => skillIndex === index ? { ...skill, [field]: value } : skill).slice(0, 5));
  }

  function addSkill() {
    if (normalizedSkills.length >= 5) return;
    onChange([...normalizedSkills, { name: "", level: "Beginner" }]);
  }

  function removeSkill(index) {
    onChange(normalizedSkills.filter((_, skillIndex) => skillIndex !== index));
  }

  return (
    <section className="profile-form-section skill-editor">
      <div className="section-row">
        <p className="card-label">Featured skills</p>
        <button className="secondary-action" disabled={normalizedSkills.length >= 5} onClick={addSkill} type="button">Add</button>
      </div>
      {normalizedSkills.map((skill, index) => (
        <div className="skill-row" key={index}>
          <input
            aria-label={`Skill ${index + 1}`}
            placeholder="React, Python, UI design..."
            value={skill.name}
            onChange={(event) => updateSkill(index, "name", event.target.value)}
          />
          <input
            aria-label={`Skill level ${index + 1}`}
            max="2"
            min="0"
            type="range"
            value={Math.max(0, levels.indexOf(skill.level))}
            onChange={(event) => updateSkill(index, "level", levels[Number(event.target.value)])}
          />
          <div className="skill-row-footer">
            <span>{skill.level || "Beginner"}</span>
            <button className="link-button" onClick={() => removeSkill(index)} type="button">Remove</button>
          </div>
        </div>
      ))}
    </section>
  );
}

function getSocialIcon(label) {
  if (label === "GitHub") return <i className="fa-brands fa-github" aria-hidden="true" />;
  if (label === "LinkedIn") return <i className="fa-brands fa-linkedin" aria-hidden="true" />;
  if (label === "Devpost") return <i className="fa-solid fa-code" aria-hidden="true" />;
  return <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />;
}

function ChoiceCard({ title, body, action, to }) {
  return (
    <Link className="choice-card" to={to}>
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <span className="choice-action">{action}</span>
    </Link>
  );
}

function ChoiceButton({ title, body, action, disabled, onClick }) {
  return (
    <button className="choice-card choice-button" disabled={disabled} onClick={onClick} type="button">
      <span>
        <strong>{title}</strong>
        <small>{body}</small>
      </span>
      <span className="choice-action">{action}</span>
    </button>
  );
}

function Field({ children, htmlFor, label }) {
  return (
    <label className="form-field" htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function MenuRow({ to, title, detail }) {
  return (
    <Link className="menu-row" to={to}>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <span className="row-chevron" aria-hidden="true">
        &gt;
      </span>
    </Link>
  );
}

function ChatPreview({ type }) {
  return (
    <section className="chat-preview native-card">
      <div className="message-bubble incoming">Welcome to {type} chat.</div>
      <div className="message-bubble outgoing">Realtime messages will appear here.</div>
      <div className="chat-input-preview">Message...</div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <div className="native-stage">
      <div className="phone-shell">
        <main className="screen-shell standalone-screen">
          <ScreenStack>
            <ScreenHeader
              eyebrow="404"
              title="Screen not found."
              body="This route is outside the current Hackmate app foundation."
            />
            <Link className="primary-action" to="/">
              Back home
            </Link>
          </ScreenStack>
        </main>
      </div>
    </div>
  );
}

function formatRouteLabel(value = "") {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(value = "") {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Status TBA";
}

function formatDateParts(value) {
  if (!value) return { weekday: "TBA", monthDay: "--", time: "Time TBA" };

  const date = new Date(value);
  return {
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date),
    monthDay: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date),
  };
}

function formatFullDate(value) {
  if (!value) return "Time TBA";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTimeRange(startsAt, endsAt) {
  if (!startsAt) return "Time TBA";

  const start = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));

  if (!endsAt) return start;

  const end = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endsAt));

  return `${start} - ${end}`;
}

function getEventSubPageBody(title) {
  if (title === "Map and Parking") return "Venue, address, coordinates, parking, and entrance information for the event.";
  if (title === "Schedule") return "Talks, food, judging, workshops, and organizer-defined sessions.";
  if (title === "FAQ") return "Rules, hours, restrictions, logistics, and organizer-provided answers.";
  if (title === "Feedback") return "Share post-event feedback with organizers.";

  return "Event content managed by organizers.";
}

function getUserDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    "Hackmate user"
  );
}

function profileToForm(profile) {
  return {
    display_name: profile?.display_name ?? "",
    avatar_url: profile?.avatar_url ?? "",
    bio: profile?.bio ?? "",
    linkedin_url: profile?.linkedin_url ?? "",
    github_url: profile?.github_url ?? "",
    devpost_url: profile?.devpost_url ?? "",
    experience_level: profile?.experience_level ?? "",
    desired_role: profile?.desired_role ?? "",
    looking_for_team: Boolean(profile?.looking_for_team),
    open_to_joining_team: Boolean(profile?.open_to_joining_team),
    availability: profile?.availability ?? "",
    featured_skills: Array.isArray(profile?.contact_preferences?.featured_skills)
      ? profile.contact_preferences.featured_skills.slice(0, 5)
      : [],
  };
}

function formToProfile(form, user) {
  return {
    user_id: user.id,
    display_name: form.display_name.trim(),
    avatar_url: emptyToNull(form.avatar_url),
    bio: emptyToNull(form.bio),
    linkedin_url: emptyToNull(form.linkedin_url),
    github_url: emptyToNull(form.github_url),
    devpost_url: emptyToNull(form.devpost_url),
    experience_level: emptyToNull(form.experience_level),
    desired_role: emptyToNull(form.desired_role),
    looking_for_team: form.looking_for_team,
    open_to_joining_team: form.open_to_joining_team,
    availability: emptyToNull(form.availability),
    contact_preferences: {
      featured_skills: (form.featured_skills ?? [])
        .filter((skill) => skill.name?.trim())
        .slice(0, 5)
        .map((skill) => ({ name: skill.name.trim(), level: skill.level || "Beginner" })),
    },
  };
}

function teamToForm(team) {
  return {
    name: team?.name ?? "",
    description: team?.description ?? "",
    project_idea: team?.project_idea ?? "",
    github_url: team?.github_url ?? "",
    devpost_url: team?.devpost_url ?? "",
    recruiting_members: Boolean(team?.recruiting_members),
  };
}

function formToTeam(form) {
  return {
    name: form.name.trim(),
    description: emptyToNull(form.description),
    project_idea: emptyToNull(form.project_idea),
    github_url: emptyToNull(form.github_url),
    devpost_url: emptyToNull(form.devpost_url),
    recruiting_members: form.recruiting_members,
  };
}

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function getRedirectPath(from, fallbackPath) {
  if (!from) return fallbackPath;
  if (typeof from === "string") return getSafeNextPath(from, fallbackPath);

  return getSafeNextPath(
    `${from.pathname ?? fallbackPath}${from.search ?? ""}${from.hash ?? ""}`,
    fallbackPath,
  );
}

function getSafeNextPath(value, fallbackPath = "/onboarding") {
  if (typeof value !== "string") return fallbackPath;
  if (!value.startsWith("/") || value.startsWith("//")) return fallbackPath;

  return value;
}
