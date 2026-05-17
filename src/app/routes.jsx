import { useEffect, useState } from "react";
import {
  createBrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { useAuth } from "../features/auth/auth-context.jsx";
import {
  getEvent,
  getEventAnnouncements,
  getEventFaqs,
  getEventSchedule,
  listEvents,
  upsertFeedback,
} from "../features/events/event-service.js";
import {
  buildDefaultProfile,
  getProfile,
  upsertProfile,
} from "../features/profiles/profile-service.js";

const bottomTabs = [
  { to: "/", label: "Home", mark: "H" },
  { to: "/events", label: "Events", mark: "E" },
  { to: "/match", label: "Match", mark: "M" },
  { to: "/chat/lobby", label: "Chat", mark: "C" },
  { to: "/profile", label: "Me", mark: "P" },
];

const sampleEvents = [
  {
    id: "starter",
    name: "Starter Hackathon",
    date: "Sat, Jun 8",
    time: "9:00 AM",
    place: "Innovation Hall",
    status: "Registration open",
  },
  {
    id: "ai-build",
    name: "AI Build Weekend",
    date: "Fri, Jul 12",
    time: "6:00 PM",
    place: "Downtown Lab",
    status: "Waitlist soon",
  },
];

const sampleMembers = ["Alex", "Mina", "Jordan"];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MobileAppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "login", element: <AuthPage /> },
      { path: "auth/callback", element: <AuthCallbackPage /> },
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
      { path: "profile", element: <RequireAuth><ProfilePage /></RequireAuth> },
      { path: "settings", element: <RequireAuth><SettingsPage /></RequireAuth> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/admin",
    element: <RequireAdmin><AdminLayout /></RequireAdmin>,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: "events", element: <AdminEventsPage /> },
      { path: "events/new", element: <AdminEventCreatePage /> },
      { path: "events/:eventId/participants", element: <AdminParticipantsPage /> },
      { path: "users", element: <AdminTablePage title="Users" /> },
      { path: "sessions", element: <AdminTablePage title="Sessions" /> },
      { path: "audit-logs", element: <AdminTablePage title="Audit Logs" /> },
    ],
  },
]);

function MobileAppLayout() {
  const { isAuthenticated, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  return (
    <div className="native-stage">
      <div className="phone-shell">
        <header className="app-topbar">
          <Link className="app-brand" to="/" aria-label="Hackmate home">
            <span className="app-brand-mark">H</span>
            <span>Hackmate</span>
          </Link>
          {isAuthenticated ? (
            <button
              className="topbar-action"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? "Signing out" : "Log out"}
            </button>
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
                {tab.mark}
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
  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Today"
        title="Build your hackathon crew."
        body="Pick your event, set your team status, and keep everything you need one thumb away."
      />

      <section className="hero-card">
        <div>
          <p className="card-label">Next step</p>
          <h2>Tell Hackmate if you have a team.</h2>
          <p>
            Add existing teammates now, or choose looking for a team to unlock the
            swipe pool.
          </p>
        </div>
        <Link className="primary-action" to="/onboarding">
          Continue setup
        </Link>
      </section>

      <section className="quick-grid" aria-label="Quick actions">
        <QuickAction to="/events" label="Events" value="2 live" />
        <QuickAction to="/match" label="Match" value="Eligibility" />
        <QuickAction to="/teams" label="Team" value="Set status" />
        <QuickAction to="/chat/lobby" label="Lobby" value="Open" />
      </section>

      <section className="native-card">
        <p className="card-label">Organizer note</p>
        <h2>Events are managed by admins.</h2>
        <p>
          Participants browse and register from the app. Event creation and
          participant lists live in the Bootstrap admin portal.
        </p>
      </section>
    </ScreenStack>
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
      <ScreenStack>
        <ScreenHeader
          eyebrow="Signed in"
          title="You are ready to build."
          body="Your Supabase session is active and protected app routes are unlocked."
        />
        <section className="native-card action-card">
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
      </ScreenStack>
    );
  }

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Welcome"
        title="Sign up fast. Start building."
        body="GitHub SSO creates your account on first login and reconnects your existing Supabase session after that."
      />
      {!isSupabaseConfigured ? <SupabaseConfigNotice /> : null}
      <section className="native-card action-card">
        <button
          className="primary-action"
          disabled={!isSupabaseConfigured || Boolean(pendingProvider)}
          onClick={() => handleProviderSignIn("github")}
          type="button"
        >
          {pendingProvider === "github" ? "Opening GitHub..." : "Sign up with GitHub"}
        </button>
        <button
          className="secondary-action"
          disabled={!isSupabaseConfigured || Boolean(pendingProvider)}
          onClick={() => handleProviderSignIn("discord")}
          type="button"
        >
          {pendingProvider === "discord" ? "Opening Discord..." : "Continue with Discord"}
        </button>
        <p className="fine-print">
          First-time GitHub users are signed up automatically when Supabase Auth
          signups are enabled. Returning users are signed back in.
        </p>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
      </section>
    </ScreenStack>
  );
}

function AuthCallbackPage() {
  const location = useLocation();
  const { error, isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();
  const nextPath = getSafeNextPath(
    new URLSearchParams(location.search).get("next"),
  );

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

function RequireAdmin({ children }) {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    isSupabaseConfigured,
    role,
    roles,
    user,
  } = useAuth();

  if (isLoading) {
    return (
      <AdminGatePage
        eyebrow="Admin"
        title="Checking admin access."
        body="Hackmate is restoring your Supabase Auth session before opening the admin portal."
      />
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AdminGatePage
        eyebrow="Setup"
        title="Supabase is not configured."
        body="Admin routes require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY so Hackmate can validate sessions."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!roles.includes("admin")) {
    return (
      <AdminGatePage
        eyebrow="Admin"
        title="Admin access required."
        body={`Signed in as ${user?.email ?? "this user"} with role ${role ?? "none"}. Add an admin role in Supabase metadata before using this portal.`}
      />
    );
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

function AdminGatePage({ eyebrow, title, body }) {
  return (
    <div className="admin-shell">
      <main className="container py-5">
        <p className="text-uppercase fw-semibold text-secondary mb-2">{eyebrow}</p>
        <h1 className="display-6 fw-bold">{title}</h1>
        <p className="lead text-secondary">{body}</p>
        <Link className="btn btn-primary" to="/login">
          Open sign in
        </Link>
      </main>
    </div>
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
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setStatus("loading");
      const { data, error } = await listEvents();

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setEvents([]);
      } else {
        setEvents(data);
        setMessage("");
      }

      setStatus("idle");
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Events"
        title="Pick your hackathon."
        body="Browse upcoming hackathons, registration state, maps, schedules, FAQs, and announcements."
      />

      {status === "loading" ? <LoadingCard label="Events" body="Loading upcoming hackathons." /> : null}
      {message ? <EmptyCard title="Events unavailable" body={message} /> : null}
      {status !== "loading" && !message && events.length === 0 ? (
        <EmptyCard
          title="No events yet."
          body="Admin-created hackathons will appear here when registration opens."
        />
      ) : null}
      {events.length > 0 ? (
        <div className="event-list">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}

      <section className="native-card compact-card">
        <p className="card-label">Admin-owned</p>
        <p>
          Event creation and participant lists are intentionally not available in
          the participant app.
        </p>
      </section>
    </ScreenStack>
  );
}

function EventCard({ event }) {
  const startsAt = formatDateParts(event.starts_at);

  return (
    <Link className="event-row" to={`/events/${event.id}`}>
      <span className="event-date">
        <strong>{startsAt.weekday}</strong>
        <span>{startsAt.monthDay}</span>
      </span>
      <span className="event-main">
        <span className="status-pill">{formatStatus(event.registration_status)}</span>
        <strong>{event.name}</strong>
        <span>{startsAt.time} at {event.location_name || "Location TBA"}</span>
      </span>
      <span className="row-chevron" aria-hidden="true">
        &gt;
      </span>
    </Link>
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
  const [form, setForm] = useState({ overall_rating: "", comments: "", anonymous: false, would_attend_again: false });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSubPage() {
      setStatus("loading");
      const eventResult = await getEvent(eventId);
      let itemResult = { data: [], error: null };

      if (title === "FAQ") itemResult = await getEventFaqs(eventId);
      if (title === "Schedule") itemResult = await getEventSchedule(eventId);

      if (!isMounted) return;

      if (eventResult.error) {
        setMessage(eventResult.error.message);
      } else if (!eventResult.data) {
        setMessage("This event was not found or is not available yet.");
      } else if (itemResult.error) {
        setEvent(eventResult.data);
        setMessage(itemResult.error.message);
      } else {
        setEvent(eventResult.data);
        setItems(itemResult.data ?? []);
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
      {title === "Map and Parking" ? <MapAndParking event={event} /> : null}
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

function MapAndParking({ event }) {
  const hasCoordinates = event?.latitude && event?.longitude;
  const mapUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${event.latitude}&mlon=${event.longitude}#map=16/${event.latitude}/${event.longitude}`
    : null;

  return (
    <section className="native-card event-section">
      <p className="card-label">Venue</p>
      <h2>{event?.location_name || "Location TBA"}</h2>
      {event?.address ? <p>{event.address}</p> : <p>Address details will appear when organizers publish them.</p>}
      {mapUrl ? (
        <a className="primary-action" href={mapUrl} rel="noreferrer" target="_blank">
          Open in OpenStreetMap
        </a>
      ) : null}
      <p className="fine-print">Parking, entrances, and venue markers will use organizer-provided map data in a later build step.</p>
    </section>
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
  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Match"
        title="Swipe only when you need teammates."
        body="Solo participants looking for a team and teams recruiting members can enter this pool. Complete teams stay out."
      />

      <section className="swipe-card" aria-label="Sample match card">
        <div className="swipe-card-top">
          <span className="avatar-circle">A</span>
          <span className="status-pill">Looking for team</span>
        </div>
        <h2>Avery Chen</h2>
        <p>Frontend developer with React, maps, and realtime UI experience.</p>
        <div className="chip-row">
          <span>React: Advanced</span>
          <span>UX: Intermediate</span>
          <span>Supabase: Beginner</span>
        </div>
        <div className="swipe-actions">
          <button className="round-action reject" type="button" aria-label="Skip profile">
            No
          </button>
          <button className="round-action accept" type="button" aria-label="Express interest">
            Yes
          </button>
        </div>
      </section>

      <section className="native-card compact-card">
        <p className="card-label">Eligibility rule</p>
        <p>
          If you already selected a complete team, this screen should show team
          status instead of swipe cards.
        </p>
      </section>
    </ScreenStack>
  );
}

function TeamsPage() {
  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Team"
        title="Set your team before you swipe."
        body="Add existing members, request to join by QR, or mark your team as recruiting."
      />

      <section className="native-card">
        <p className="card-label">Current team draft</p>
        <h2>Project Night Owls</h2>
        <div className="member-stack">
          {sampleMembers.map((member) => (
            <span key={member} className="member-pill">
              {member}
            </span>
          ))}
          <Link className="member-pill add-member" to="/onboarding">
            Add member
          </Link>
        </div>
      </section>

      <section className="choice-list">
        <ChoiceCard
          title="Team is complete"
          body="Hide swipe and keep your team focused on event prep."
          action="Save complete"
          to="/teams/complete-team"
        />
        <ChoiceCard
          title="Recruit more members"
          body="Open roles and let the team swipe through eligible participants."
          action="Open recruiting"
          to="/match"
        />
      </section>
    </ScreenStack>
  );
}

function TeamDetailPage() {
  const { teamId } = useParams();

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Team"
        title={formatRouteLabel(teamId)}
        body="Team profile, members, open roles, required skills, project links, and recruiting state will live here."
      />
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
      <ChatPreview type="team" />
    </ScreenStack>
  );
}

function JoinTeamPage() {
  const { token } = useParams();

  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="QR join"
        title="Request to join this team?"
        body="Sign in, confirm the request, and wait for the team lead to approve access."
      />
      <section className="native-card action-card">
        <p className="fine-print">Token preview: {token}</p>
        <button className="primary-action" type="button">
          Send join request
        </button>
      </section>
    </ScreenStack>
  );
}

function ChatPage({ title }) {
  return (
    <ScreenStack>
      <ScreenHeader
        eyebrow="Chat"
        title={title}
        body="Fast, focused conversations for the lobby, teams, and organizer support."
      />
      <ChatPreview type={title.toLowerCase()} />
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
      <ScreenHeader
        eyebrow="Profile"
        title="Make it easy to choose you."
        body="Show links, projects, skills, competency, desired role, availability, and team status."
      />
      <section className="profile-card native-card">
        {avatarUrl ? (
          <img className="profile-avatar" src={avatarUrl} alt="" />
        ) : (
          <span className="profile-avatar">{displayName.charAt(0)}</span>
        )}
        <h2>{displayName}</h2>
        <p className="fine-print">{user?.email ?? "OAuth account"}</p>
        <div className="chip-row">
          <span>{user?.app_metadata?.provider ?? "OAuth"}</span>
          <span>{role ?? "participant"}</span>
          <span>{form.looking_for_team ? "Looking for team" : "Team status open"}</span>
        </div>
      </section>
      <form className="native-card profile-form" onSubmit={handleSubmit}>
        <Field label="Display name" htmlFor="displayName">
          <input
            id="displayName"
            required
            value={form.display_name}
            onChange={(event) => updateField("display_name", event.target.value)}
          />
        </Field>
        <Field label="Avatar URL" htmlFor="avatarUrl">
          <input
            id="avatarUrl"
            inputMode="url"
            value={form.avatar_url}
            onChange={(event) => updateField("avatar_url", event.target.value)}
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
        <div className="form-grid">
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
        </div>
        <Field label="Devpost" htmlFor="devpostUrl">
          <input
            id="devpostUrl"
            inputMode="url"
            value={form.devpost_url}
            onChange={(event) => updateField("devpost_url", event.target.value)}
          />
        </Field>
        <label className="check-row">
          <input
            checked={form.looking_for_team}
            type="checkbox"
            onChange={(event) => {
              updateField("looking_for_team", event.target.checked);
              updateField("open_to_joining_team", event.target.checked);
            }}
          />
          <span>I am looking for a team and can appear in matching.</span>
        </label>
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

function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin">
          Hackmate Admin
        </Link>
        <nav className="nav flex-column gap-2" aria-label="Admin navigation">
          <NavLink className="btn btn-outline-light text-start" to="/admin/events">
            Events
          </NavLink>
          <NavLink className="btn btn-outline-light text-start" to="/admin/events/new">
            Create Event
          </NavLink>
          <NavLink className="btn btn-outline-light text-start" to="/admin/users">
            Users
          </NavLink>
          <NavLink className="btn btn-outline-light text-start" to="/admin/sessions">
            Sessions
          </NavLink>
          <NavLink className="btn btn-outline-light text-start" to="/admin/audit-logs">
            Audit Logs
          </NavLink>
          <NavLink className="btn btn-light text-start" to="/">
            Back to App
          </NavLink>
        </nav>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

function AdminDashboardPage() {
  return (
    <section className="container-fluid py-4">
      <p className="text-uppercase fw-semibold text-secondary mb-2">Admin portal</p>
      <h1 className="display-6 fw-bold">Operations overview</h1>
      <p className="lead text-secondary">
        Event creation, participant lists, users, sessions, IP addresses, and
        audit logs are managed here with Bootstrap screens.
      </p>
      <div className="row g-3 mt-2">
        <AdminMetric label="Events" value="--" />
        <AdminMetric label="Participants" value="--" />
        <AdminMetric label="Sessions" value="--" />
      </div>
    </section>
  );
}

function AdminEventsPage() {
  return (
    <section className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4">
        <div>
          <p className="text-uppercase fw-semibold text-secondary mb-2">Events</p>
          <h1 className="display-6 fw-bold mb-0">Manage hackathons</h1>
        </div>
        <Link className="btn btn-primary" to="/admin/events/new">
          Create event
        </Link>
      </div>
      <div className="table-responsive rounded shadow-sm">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Status</th>
              <th scope="col">Participants</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sampleEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.name}</td>
                <td>{event.status}</td>
                <td>--</td>
                <td>
                  <Link className="btn btn-sm btn-outline-primary" to={`/admin/events/${event.id}/participants`}>
                    View participants
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminEventCreatePage() {
  return (
    <section className="container-fluid py-4">
      <p className="text-uppercase fw-semibold text-secondary mb-2">Create event</p>
      <h1 className="display-6 fw-bold">New hackathon</h1>
      <form className="card shadow-sm mt-4">
        <div className="card-body row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="eventName">Event name</label>
            <input className="form-control" id="eventName" placeholder="Hackathon name" />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="eventCapacity">Capacity</label>
            <input className="form-control" id="eventCapacity" placeholder="250" type="number" />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="eventStart">Starts at</label>
            <input className="form-control" id="eventStart" type="datetime-local" />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label" htmlFor="eventEnd">Ends at</label>
            <input className="form-control" id="eventEnd" type="datetime-local" />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="eventDescription">Description</label>
            <textarea className="form-control" id="eventDescription" rows="4" placeholder="Event summary, restrictions, hours, and logistics" />
          </div>
          <div className="col-12 d-flex justify-content-end">
            <button className="btn btn-primary" type="button">Save draft</button>
          </div>
        </div>
      </form>
    </section>
  );
}

function AdminParticipantsPage() {
  const { eventId } = useParams();

  return (
    <section className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4">
        <div>
          <p className="text-uppercase fw-semibold text-secondary mb-2">Participants</p>
          <h1 className="display-6 fw-bold mb-0">{formatRouteLabel(eventId)}</h1>
        </div>
        <input className="form-control admin-search" placeholder="Search participants" />
      </div>
      <div className="table-responsive rounded shadow-sm">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Team status</th>
              <th scope="col">Registration</th>
              <th scope="col">Check-in</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Placeholder participant</td>
              <td>Looking for team</td>
              <td>Registered</td>
              <td>Pending</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminMetric({ label, value }) {
  return (
    <div className="col-12 col-md-4">
      <div className="card shadow-sm">
        <div className="card-body">
          <p className="text-secondary mb-1">{label}</p>
          <strong className="fs-3">{value}</strong>
        </div>
      </div>
    </div>
  );
}

function AdminTablePage({ title }) {
  return (
    <section className="container-fluid py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between gap-3 align-items-md-center mb-4">
        <div>
          <p className="text-uppercase fw-semibold text-secondary mb-2">Admin</p>
          <h1 className="display-6 fw-bold mb-0">{title}</h1>
        </div>
        <input className="form-control admin-search" placeholder={`Search ${title.toLowerCase()}`} />
      </div>
      <div className="table-responsive rounded shadow-sm">
        <table className="table table-striped table-hover align-middle mb-0">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Placeholder row</td>
              <td>Pending implementation</td>
              <td>--</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
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
    contact_preferences: {},
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
