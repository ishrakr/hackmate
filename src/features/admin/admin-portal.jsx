import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  consumeOAuthFlow,
  useAuth,
} from "../auth/auth-context.jsx";
import {
  getAdminDashboardMetrics,
  getAdminEvent,
  listAdminAuditLogs,
  listAdminEvents,
  listAdminSessions,
  listAdminUsers,
  listEventParticipants,
  saveAdminEvent,
} from "./admin-service.js";

const eventStatusOptions = ["draft", "open", "waitlist", "closed", "cancelled"];
const registrationStatusOptions = ["Registered", "Waitlisted", "Checked in", "No-show", "Cancelled"];
const sessionProviderOptions = ["github"];
const adminBasePath = import.meta.env.VITE_APP_MODE === "admin" ? "" : "/admin";
const isStandaloneAdmin = import.meta.env.VITE_APP_MODE === "admin";
const temporaryGithubAdmin = "ishrakr";

export function RequireAdmin({ children }) {
  const location = useLocation();
  const {
    isAuthenticated,
    isLoading,
    isResolvingRoles,
    isSupabaseConfigured,
    role,
    roles,
    user,
  } = useAuth();
  const nextPath = `${location.pathname}${location.search}${location.hash}`;

  if (isLoading || isResolvingRoles) {
    return (
      <AdminGatePage
        eyebrow="Admin"
        title="Checking admin access."
        body="Hackmate is validating your session and role membership before opening the admin portal."
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
    return <AdminSignInPage nextPath={nextPath} />;
  }

  if (!roles.includes("admin") && !isTemporaryGithubAdmin(user)) {
    return (
      <AdminGatePage
        eyebrow="Admin"
        title="Admin access required."
        body={`Signed in as ${user?.email ?? "this user"} with role ${role ?? "none"}. For now, only GitHub user ${temporaryGithubAdmin} can use this portal.`}
      />
    );
  }

  return children;
}

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-top">
          <Link className="admin-brand" to={adminPath()}>
            <span className="app-brand-mark">H</span>
            <span>Hackmate Admin</span>
          </Link>
          <p className="admin-sidebar-copy">
            Bootstrap operations console for events, registrations, sessions, and audit visibility.
          </p>
        </div>

        <nav className="nav flex-column gap-2" aria-label="Admin navigation">
          <AdminNavLink end to={adminPath()}>Overview</AdminNavLink>
          <AdminNavLink to={adminPath("/events")}>Events</AdminNavLink>
          <AdminNavLink to={adminPath("/events/new")}>Create Event</AdminNavLink>
          <AdminNavLink to={adminPath("/users")}>Users</AdminNavLink>
          <AdminNavLink to={adminPath("/sessions")}>Sessions</AdminNavLink>
          <AdminNavLink to={adminPath("/audit-logs")}>Audit Logs</AdminNavLink>
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <strong>{getUserLabel(user)}</strong>
            <span>{user?.email ?? "Authenticated admin"}</span>
          </div>
          <div className="d-grid gap-2">
            {isStandaloneAdmin ? null : (
              <Link className="btn btn-outline-light" to="/">
                Back to App
              </Link>
            )}
            <button
              className="btn btn-light"
              disabled={isSigningOut}
              onClick={handleSignOut}
              type="button"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadMetrics() {
      setStatus("loading");
      const { data, error } = await getAdminDashboardMetrics();

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
        setMetrics(null);
      } else {
        setMetrics(data);
        setMessage("");
      }

      setStatus("idle");
    }

    loadMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="container-fluid py-4 py-lg-5">
      <AdminPageHeader
        eyebrow="Admin portal"
        title="Operations overview"
        body="Keep the participant app lightweight while admins manage event inventory, registration activity, session visibility, and audit trails here."
      />

      {status === "loading" ? <AdminInfoAlert tone="info" message="Loading admin metrics." /> : null}
      {message ? <AdminInfoAlert tone="danger" message={message} /> : null}

      <div className="row g-3 mt-1">
        <AdminMetric label="Events" value={metrics?.events ?? "--"} />
        <AdminMetric label="Participants" value={metrics?.participants ?? "--"} />
        <AdminMetric label="Sessions" value={metrics?.sessions ?? "--"} />
        <AdminMetric label="Audit logs" value={metrics?.auditLogs ?? "--"} />
      </div>

      <div className="row g-4 mt-1">
        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <p className="text-uppercase text-secondary fw-semibold small mb-2">Recent events</p>
                  <h2 className="h4 mb-0">Latest hackathons</h2>
                </div>
                <Link className="btn btn-sm btn-outline-primary" to={adminPath("/events")}>
                  View all
                </Link>
              </div>
              <div className="list-group list-group-flush">
                {(metrics?.recentEvents ?? []).map((event) => (
                  <div className="list-group-item px-0" key={event.id}>
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div>
                        <strong className="d-block">{event.name}</strong>
                        <span className="text-secondary">
                          {formatFullDate(event.starts_at)} at {event.location_name || "Location TBA"}
                        </span>
                      </div>
                      <span className={`badge ${getStatusBadgeClass(event.registration_status)}`}>
                        {formatStatus(event.registration_status)}
                      </span>
                    </div>
                  </div>
                ))}
                {!metrics?.recentEvents?.length ? (
                  <p className="text-secondary mb-0">No events created yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <p className="text-uppercase text-secondary fw-semibold small mb-2">Recent audit activity</p>
                  <h2 className="h4 mb-0">Security and change log</h2>
                </div>
                <Link className="btn btn-sm btn-outline-primary" to={adminPath("/audit-logs")}>
                  Open logs
                </Link>
              </div>
              <div className="list-group list-group-flush">
                {(metrics?.recentAuditLogs ?? []).map((log) => (
                  <div className="list-group-item px-0" key={log.id}>
                    <strong className="d-block">{log.action}</strong>
                    <span className="text-secondary">
                      {log.target_type || "system"} {log.target_id ? `• ${shortId(log.target_id)}` : ""} • {formatFullDate(log.created_at)}
                    </span>
                  </div>
                ))}
                {!metrics?.recentAuditLogs?.length ? (
                  <p className="text-secondary mb-0">No audit activity yet.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const pageSize = 8;

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setStatus("loading");
      const { data, count: nextCount, error } = await listAdminEvents({
        page,
        pageSize,
        search,
        registrationStatus: statusFilter,
      });

      if (!isMounted) return;

      if (error) {
        setEvents([]);
        setCount(0);
        setMessage(error.message);
      } else {
        setEvents(data);
        setCount(nextCount);
        setMessage("");
      }

      setStatus("idle");
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [page, search, statusFilter]);

  return (
    <section className="container-fluid py-4 py-lg-5">
      <AdminPageHeader
        eyebrow="Events"
        title="Manage hackathons"
        body="Create and edit event records, adjust registration state, and jump straight into participant operations."
        action={
          <Link className="btn btn-primary" to={adminPath("/events/new")}>
            Create event
          </Link>
        }
      />

      <AdminFilterBar
        searchPlaceholder="Search events or locations"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          className="form-select"
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          value={statusFilter}
        >
          <option value="all">All statuses</option>
          {eventStatusOptions.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {formatStatus(statusOption)}
            </option>
          ))}
        </select>
      </AdminFilterBar>

      {status === "loading" ? <AdminInfoAlert tone="info" message="Loading events." /> : null}
      {message ? <AdminInfoAlert tone="danger" message={message} /> : null}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Event</th>
                <th scope="col">When</th>
                <th scope="col">Capacity</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <strong className="d-block">{event.name}</strong>
                    <span className="text-secondary">{event.location_name || "Location TBA"}</span>
                  </td>
                  <td>{formatFullDate(event.starts_at)}</td>
                  <td>{event.capacity ?? "Uncapped"}</td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(event.registration_status)}`}>
                      {formatStatus(event.registration_status)}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <Link className="btn btn-sm btn-outline-primary" to={adminPath(`/events/${event.id}/edit`)}>
                        Edit
                      </Link>
                      <Link className="btn btn-sm btn-outline-secondary" to={adminPath(`/events/${event.id}/participants`)}>
                        Participants
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!events.length && status !== "loading" ? (
                <tr>
                  <td className="text-center text-secondary py-4" colSpan="5">
                    No events matched this search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}

export function AdminEventEditorPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const isEditing = Boolean(eventId);
  const [form, setForm] = useState(buildEventForm());
  const [status, setStatus] = useState(isEditing ? "loading" : "idle");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isEditing) return undefined;

    let isMounted = true;

    async function loadEvent() {
      setStatus("loading");
      const { data, error } = await getAdminEvent(eventId);

      if (!isMounted) return;

      if (error) {
        setMessage(error.message);
      } else if (!data) {
        setMessage("This event could not be found.");
      } else {
        setForm(eventToForm(data));
        setMessage("");
      }

      setStatus("idle");
    }

    loadEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId, isEditing]);

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault();
    setStatus("saving");
    setMessage("");
    setSuccess("");

    const payload = formToEventPayload(form);
    const { data, error } = await saveAdminEvent(eventId, payload);

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return;
    }

    setSuccess(isEditing ? "Event updated." : "Event created.");
    setStatus("idle");

    if (!isEditing && data?.id) {
      navigate(adminPath(`/events/${data.id}/edit`), { replace: true });
    }
  }

  return (
    <section className="container-fluid py-4 py-lg-5">
      <AdminPageHeader
        eyebrow={isEditing ? "Edit event" : "Create event"}
        title={isEditing ? "Update hackathon details" : "New hackathon"}
        body="This form controls the participant-facing event card and detail screens. Organizers can manage FAQ and schedule records after creation."
        action={
          isEditing ? (
            <Link className="btn btn-outline-primary" to={adminPath(`/events/${eventId}/participants`)}>
              View participants
            </Link>
          ) : null
        }
      />

      {status === "loading" ? <AdminInfoAlert tone="info" message="Loading event details." /> : null}
      {message ? <AdminInfoAlert tone="danger" message={message} /> : null}
      {success ? <AdminInfoAlert tone="success" message={success} /> : null}

      <form className="card shadow-sm border-0" onSubmit={handleSubmit}>
        <div className="card-body row g-3">
          <div className="col-12 col-lg-8">
            <label className="form-label" htmlFor="eventName">Event name</label>
            <input
              className="form-control"
              id="eventName"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Hackmate Spring Jam"
              required
              value={form.name}
            />
          </div>
          <div className="col-12 col-lg-4">
            <label className="form-label" htmlFor="eventStatus">Registration status</label>
            <select
              className="form-select"
              id="eventStatus"
              onChange={(event) => setForm((current) => ({ ...current, registration_status: event.target.value }))}
              value={form.registration_status}
            >
              {eventStatusOptions.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {formatStatus(statusOption)}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="eventDescription">Description</label>
            <textarea
              className="form-control"
              id="eventDescription"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short overview for participants, volunteers, and sponsors."
              rows="5"
              value={form.description}
            />
          </div>

          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label" htmlFor="eventStart">Starts at</label>
            <input
              className="form-control"
              id="eventStart"
              onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))}
              required
              type="datetime-local"
              value={form.starts_at}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label" htmlFor="eventEnd">Ends at</label>
            <input
              className="form-control"
              id="eventEnd"
              onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))}
              type="datetime-local"
              value={form.ends_at}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label" htmlFor="eventCapacity">Capacity</label>
            <input
              className="form-control"
              id="eventCapacity"
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
              placeholder="250"
              type="number"
              value={form.capacity}
            />
          </div>
          <div className="col-12 col-md-6 col-xl-3">
            <label className="form-label" htmlFor="eventBanner">Banner image URL</label>
            <input
              className="form-control"
              id="eventBanner"
              onChange={(event) => setForm((current) => ({ ...current, banner_url: event.target.value }))}
              placeholder="https://..."
              value={form.banner_url}
            />
          </div>

          <div className="col-12 col-lg-5">
            <label className="form-label" htmlFor="eventLocation">Location</label>
            <input
              className="form-control"
              id="eventLocation"
              onChange={(event) => setForm((current) => ({ ...current, location_name: event.target.value }))}
              placeholder="Innovation Hall"
              value={form.location_name}
            />
          </div>
          <div className="col-12 col-lg-7">
            <label className="form-label" htmlFor="eventAddress">Address</label>
            <input
              className="form-control"
              id="eventAddress"
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="123 Maker Ave, Chicago, IL"
              value={form.address}
            />
          </div>

          <div className="col-12">
            <div className="rounded-4 border bg-body-tertiary p-3">
              <p className="fw-semibold mb-2">Operational note</p>
              <p className="text-secondary mb-0">
                FAQ, schedule, restrictions, hours, parking, and food information are intentionally managed in supporting tables after the core event exists.
              </p>
            </div>
          </div>

          <div className="col-12 d-flex justify-content-end gap-2">
            <Link className="btn btn-outline-secondary" to={adminPath("/events")}>
              Cancel
            </Link>
            <button className="btn btn-primary" disabled={status === "saving"} type="submit">
              {status === "saving" ? "Saving..." : isEditing ? "Save changes" : "Create event"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export function AdminParticipantsPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const pageSize = 10;

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setStatus("loading");
      const [{ data: eventData, error: eventError }, participantsResult] = await Promise.all([
        getAdminEvent(eventId),
        listEventParticipants({
          eventId,
          page,
          pageSize,
          search,
          registrationStatus: statusFilter,
        }),
      ]);

      if (!isMounted) return;

      if (eventError) {
        setMessage(eventError.message);
        setEvent(null);
      } else {
        setEvent(eventData);
      }

      if (participantsResult.error) {
        setParticipants([]);
        setCount(0);
        setMessage(participantsResult.error.message);
      } else {
        setParticipants(participantsResult.data);
        setCount(participantsResult.count);
        if (!eventError) {
          setMessage("");
        }
      }

      setStatus("idle");
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [eventId, page, search, statusFilter]);

  return (
    <section className="container-fluid py-4 py-lg-5">
      <AdminPageHeader
        eyebrow="Participants"
        title={event?.name || "Event participants"}
        body="Review registration state, team visibility, and check-in progress for this event."
        action={
          <Link className="btn btn-outline-primary" to={adminPath(`/events/${eventId}/edit`)}>
            Edit event
          </Link>
        }
      />

      <AdminFilterBar
        searchPlaceholder="Search by participant name or user ID"
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        <select
          className="form-select"
          onChange={(event) => {
            setStatusFilter(event.target.value);
            setPage(1);
          }}
          value={statusFilter}
        >
          <option value="all">All registrations</option>
          {registrationStatusOptions.map((statusOption) => (
            <option key={statusOption} value={statusOption}>
              {statusOption}
            </option>
          ))}
        </select>
      </AdminFilterBar>

      {status === "loading" ? <AdminInfoAlert tone="info" message="Loading participants." /> : null}
      {message ? <AdminInfoAlert tone="danger" message={message} /> : null}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th scope="col">Participant</th>
                <th scope="col">Registration</th>
                <th scope="col">Check-in</th>
                <th scope="col">Team</th>
                <th scope="col">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((participant) => (
                <tr key={participant.id}>
                  <td>
                    <strong className="d-block">{participant.display_name}</strong>
                    <span className="text-secondary">{shortId(participant.user_id)}</span>
                  </td>
                  <td>{participant.status}</td>
                  <td>{participant.check_in_status}</td>
                  <td>
                    {participant.team_name ? participant.team_name : participant.looking_for_team ? "Looking for team" : "Solo"}
                  </td>
                  <td>{formatFullDate(participant.last_activity_at)}</td>
                </tr>
              ))}
              {!participants.length && status !== "loading" ? (
                <tr>
                  <td className="text-center text-secondary py-4" colSpan="5">
                    No participants matched this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}

export function AdminTablePage({ resource, title }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const pageSize = 10;

  useEffect(() => {
    let isMounted = true;

    async function loadTable() {
      setStatus("loading");

      const loader =
        resource === "users"
          ? listAdminUsers({ page, pageSize, search })
          : resource === "sessions"
            ? listAdminSessions({ page, pageSize, search, provider: filter })
            : listAdminAuditLogs({ page, pageSize, search });

      const { data, count: nextCount, error } = await loader;

      if (!isMounted) return;

      if (error) {
        setRows([]);
        setCount(0);
        setMessage(error.message);
      } else {
        setRows(data);
        setCount(nextCount);
        setMessage("");
      }

      setStatus("idle");
    }

    loadTable();

    return () => {
      isMounted = false;
    };
  }, [filter, page, pageSize, resource, search]);

  return (
    <section className="container-fluid py-4 py-lg-5">
      <AdminPageHeader
        eyebrow="Admin"
        title={title}
        body={getTableDescription(resource)}
      />

      <AdminFilterBar
        searchPlaceholder={getTableSearchPlaceholder(resource)}
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
      >
        {resource === "sessions" ? (
          <select
            className="form-select"
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
            value={filter}
          >
            <option value="all">All providers</option>
            {sessionProviderOptions.map((provider) => (
              <option key={provider} value={provider}>
                {formatStatus(provider)}
              </option>
            ))}
          </select>
        ) : null}
      </AdminFilterBar>

      {status === "loading" ? <AdminInfoAlert tone="info" message={`Loading ${title.toLowerCase()}.`} /> : null}
      {message ? <AdminInfoAlert tone="danger" message={message} /> : null}

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          {resource === "users" ? <UsersTable rows={rows} status={status} /> : null}
          {resource === "sessions" ? <SessionsTable rows={rows} status={status} /> : null}
          {resource === "audit-logs" ? <AuditLogsTable rows={rows} status={status} /> : null}
        </div>
      </div>

      <AdminPagination count={count} page={page} pageSize={pageSize} onPageChange={setPage} />
    </section>
  );
}

export function AdminGatePage({ eyebrow, title, body }) {
  return (
    <div className="admin-shell">
      <main className="container py-5">
        <p className="text-uppercase fw-semibold text-secondary mb-2">{eyebrow}</p>
        <h1 className="display-6 fw-bold">{title}</h1>
        <p className="lead text-secondary">{body}</p>
        <Link className="btn btn-primary" to={adminPath()}>
          Back to admin
        </Link>
      </main>
    </div>
  );
}

export function AdminNotFoundPage() {
  return (
    <section className="container-fluid py-4 py-lg-5">
      <div className="card shadow-sm border-0">
        <div className="card-body p-4 p-lg-5">
          <p className="text-uppercase fw-semibold text-secondary mb-2">404</p>
          <h1 className="display-6 fw-bold mb-3">Admin page not found</h1>
          <p className="lead text-secondary">
            This standalone admin app uses Bootstrap routes from the admin root.
          </p>
          <Link className="btn btn-primary" to={adminPath()}>
            Open dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}

function AdminSignInPage({ nextPath }) {
  const { error, signInWithProvider } = useAuth();
  const [pendingProvider, setPendingProvider] = useState("");
  const adminNextPath = nextPath || adminPath();

  async function handleSignIn(provider) {
    setPendingProvider(provider);
    const { error: signInError } = await signInWithProvider(
      provider,
      adminNextPath,
      {
        callbackOrigin: window.location.origin,
        callbackPath: "/auth/callback",
        mode: "admin",
      },
    );

    if (signInError) {
      setPendingProvider("");
    }
  }

  return (
    <div className="admin-shell admin-auth-shell">
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-xl-5">
            <div className="card shadow border-0">
              <div className="card-body p-4 p-lg-5">
                <p className="text-uppercase fw-semibold text-secondary mb-2">Admin portal</p>
                <h1 className="display-6 fw-bold mb-3">Sign in to Hackmate Admin</h1>
                <p className="text-secondary mb-4">
                  This is the standalone Bootstrap operations console for events,
                  participants, sessions, users, and audit logs.
                </p>
                <div className="d-grid gap-2">
                  <button
                    className="btn btn-primary btn-lg"
                    disabled={Boolean(pendingProvider)}
                    onClick={() => handleSignIn("github")}
                    type="button"
                  >
                    {pendingProvider === "github" ? "Opening GitHub..." : "Continue with GitHub"}
                  </button>
                </div>
                {error ? <div className="alert alert-danger mt-4 mb-0">{error}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function AdminAuthCallbackPage() {
  const location = useLocation();
  const { error, isAuthenticated, isLoading, isSupabaseConfigured } = useAuth();
  const nextPath = getSafeAdminPath(
    new URLSearchParams(location.search).get("next"),
  );

  if (!isSupabaseConfigured) {
    return (
      <AdminGatePage
        eyebrow="Setup"
        title="Supabase is not configured."
        body="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before completing admin sign in."
      />
    );
  }

  if (!isLoading && isAuthenticated) {
    consumeOAuthFlow();
    return <Navigate replace to={nextPath} />;
  }

  return (
    <AdminGatePage
      eyebrow="OAuth"
      title={isLoading ? "Finishing admin sign in." : "Sign in was not completed."}
      body={error || "Hackmate Admin is reading the Supabase Auth callback and restoring your session."}
    />
  );
}

function AdminNavLink({ children, end = false, to }) {
  return (
    <NavLink
      className={({ isActive }) =>
        `btn text-start ${isActive ? "btn-light text-dark" : "btn-outline-light"}`
      }
      end={end}
      to={to}
    >
      {children}
    </NavLink>
  );
}

function adminPath(path = "") {
  if (!path || path === "/") return adminBasePath || "/";
  return `${adminBasePath}${path}`;
}

function getSafeAdminPath(value) {
  if (typeof value !== "string") return adminPath();
  if (!value.startsWith("/") || value.startsWith("//")) return adminPath();
  if (isStandaloneAdmin && value.startsWith("/admin")) {
    return value.replace(/^\/admin/, "") || "/";
  }

  return value;
}

function isTemporaryGithubAdmin(user) {
  if (!user) return false;

  const providers = [
    user.app_metadata?.provider,
    ...(Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []),
  ].filter(Boolean);
  const usernames = [
    user.user_metadata?.user_name,
    user.user_metadata?.preferred_username,
    user.user_metadata?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return providers.includes("github") && usernames.includes(temporaryGithubAdmin);
}

function AdminMetric({ label, value }) {
  return (
    <div className="col-12 col-md-6 col-xl-3">
      <div className="card shadow-sm border-0 h-100">
        <div className="card-body">
          <p className="text-secondary mb-1">{label}</p>
          <strong className="fs-2">{value}</strong>
        </div>
      </div>
    </div>
  );
}

function AdminPageHeader({ eyebrow, title, body, action }) {
  return (
    <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end gap-3 mb-4">
      <div>
        <p className="text-uppercase fw-semibold text-secondary mb-2">{eyebrow}</p>
        <h1 className="display-6 fw-bold mb-2">{title}</h1>
        <p className="lead text-secondary mb-0 admin-lead">{body}</p>
      </div>
      {action}
    </div>
  );
}

function AdminFilterBar({
  children,
  onSearchChange,
  searchPlaceholder,
  searchValue,
}) {
  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-body d-flex flex-column flex-lg-row gap-3 align-items-lg-center">
        <input
          className="form-control admin-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          value={searchValue}
        />
        {children ? <div className="admin-filter-slot">{children}</div> : null}
      </div>
    </div>
  );
}

function AdminInfoAlert({ message, tone }) {
  const className =
    tone === "danger"
      ? "alert alert-danger"
      : tone === "success"
        ? "alert alert-success"
        : "alert alert-secondary";

  return <div className={className}>{message}</div>;
}

function AdminPagination({ count, page, pageSize, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mt-4">
      <p className="text-secondary mb-0">
        Page {page} of {totalPages} • {count} total records
      </p>
      <div className="btn-group">
        <button
          className="btn btn-outline-secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Previous
        </button>
        <button
          className="btn btn-outline-secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function UsersTable({ rows, status }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th scope="col">User</th>
          <th scope="col">Roles</th>
          <th scope="col">Profile</th>
          <th scope="col">Registrations</th>
          <th scope="col">Created</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.user_id}>
            <td>
              <strong className="d-block">{row.display_name}</strong>
              <span className="text-secondary">{shortId(row.user_id)}</span>
            </td>
            <td>{row.roles.map(formatStatus).join(", ")}</td>
            <td>
              {row.desired_role || "Role not set"}
              <div className="text-secondary small">
                {row.experience_level || "Experience not set"}
              </div>
            </td>
            <td>{row.registration_count}</td>
            <td>{formatFullDate(row.created_at)}</td>
          </tr>
        ))}
        {!rows.length && status !== "loading" ? (
          <tr>
            <td className="text-center text-secondary py-4" colSpan="5">
              No users matched this search.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function SessionsTable({ rows, status }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th scope="col">User</th>
          <th scope="col">Provider</th>
          <th scope="col">IP address</th>
          <th scope="col">User agent</th>
          <th scope="col">Last seen</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong className="d-block">{row.display_name}</strong>
              <span className="text-secondary">{shortId(row.user_id)}</span>
            </td>
            <td>{formatStatus(row.provider || "unknown")}</td>
            <td>{row.ip_address || "Unavailable"}</td>
            <td className="admin-wrap">{row.user_agent || "Unavailable"}</td>
            <td>{formatFullDate(row.last_seen_at)}</td>
          </tr>
        ))}
        {!rows.length && status !== "loading" ? (
          <tr>
            <td className="text-center text-secondary py-4" colSpan="5">
              No sessions matched this filter.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function AuditLogsTable({ rows, status }) {
  return (
    <table className="table table-hover align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th scope="col">Actor</th>
          <th scope="col">Action</th>
          <th scope="col">Target</th>
          <th scope="col">IP address</th>
          <th scope="col">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <strong className="d-block">{row.actor_name}</strong>
              <span className="text-secondary">{row.actor_user_id ? shortId(row.actor_user_id) : "System"}</span>
            </td>
            <td className="admin-wrap">{row.action}</td>
            <td>
              {row.target_type || "System"}
              <div className="text-secondary small">
                {row.target_id ? shortId(row.target_id) : "No target"}
              </div>
            </td>
            <td>{row.ip_address || "Unavailable"}</td>
            <td>{formatFullDate(row.created_at)}</td>
          </tr>
        ))}
        {!rows.length && status !== "loading" ? (
          <tr>
            <td className="text-center text-secondary py-4" colSpan="5">
              No audit logs matched this search.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

function getTableDescription(resource) {
  if (resource === "users") {
    return "Review participant and organizer profiles, role assignments, and registration footprint.";
  }

  if (resource === "sessions") {
    return "Visibility into login provider usage, IP addresses, devices, and recent activity.";
  }

  return "Track admin and system actions that matter for security reviews and operational debugging.";
}

function getTableSearchPlaceholder(resource) {
  if (resource === "users") return "Search users by name or exact user ID";
  if (resource === "sessions") return "Search sessions by user ID or user agent";
  return "Search by action or target type";
}

function getStatusBadgeClass(status) {
  if (status === "open" || status === "Checked in") return "text-bg-success";
  if (status === "waitlist" || status === "Waitlisted") return "text-bg-warning";
  if (status === "closed" || status === "cancelled" || status === "No-show") return "text-bg-secondary";
  return "text-bg-primary";
}

function formatStatus(value = "") {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

function formatFullDate(value) {
  if (!value) return "Time TBA";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildEventForm() {
  return {
    name: "",
    description: "",
    starts_at: "",
    ends_at: "",
    location_name: "",
    address: "",
    capacity: "",
    registration_status: "draft",
    banner_url: "",
  };
}

function eventToForm(event) {
  return {
    name: event.name ?? "",
    description: event.description ?? "",
    starts_at: toDateTimeInputValue(event.starts_at),
    ends_at: toDateTimeInputValue(event.ends_at),
    location_name: event.location_name ?? "",
    address: event.address ?? "",
    capacity: event.capacity ?? "",
    registration_status: event.registration_status ?? "draft",
    banner_url: event.banner_url ?? "",
  };
}

function formToEventPayload(form) {
  return {
    name: form.name.trim(),
    description: emptyToNull(form.description),
    starts_at: new Date(form.starts_at).toISOString(),
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    location_name: emptyToNull(form.location_name),
    address: emptyToNull(form.address),
    capacity: form.capacity === "" ? null : Number(form.capacity),
    registration_status: form.registration_status,
    banner_url: emptyToNull(form.banner_url),
  };
}

function emptyToNull(value) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function toDateTimeInputValue(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const normalized = new Date(date.getTime() - offset * 60 * 1000);
  return normalized.toISOString().slice(0, 16);
}

function shortId(value = "") {
  return value ? `${value.slice(0, 8)}...` : "Unavailable";
}

function getUserLabel(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    "Hackmate admin"
  );
}
