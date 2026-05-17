import { supabase } from "../../lib/supabase/client.js";

const eventColumns = `
  id,
  name,
  description,
  starts_at,
  ends_at,
  location_name,
  address,
  capacity,
  registration_status,
  banner_url,
  organizer_id,
  created_at,
  updated_at
`;

export async function listCurrentUserRoles(userId) {
  if (!supabase || !userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, roles(name)")
    .eq("user_id", userId);

  return {
    data:
      data?.flatMap((row) => {
        const name = row.roles?.name;
        return name ? [name] : [];
      }) ?? [],
    error,
  };
}

export async function getAdminDashboardMetrics() {
  if (!supabase) {
    return {
      data: {
        events: 0,
        participants: 0,
        sessions: 0,
        auditLogs: 0,
        recentEvents: [],
        recentAuditLogs: [],
      },
      error: null,
    };
  }

  const [
    eventsCount,
    participantsCount,
    sessionsCount,
    auditLogsCount,
    recentEvents,
    recentAuditLogs,
  ] = await Promise.all([
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("event_registrations").select("id", { count: "exact", head: true }),
    supabase.from("login_sessions").select("id", { count: "exact", head: true }),
    supabase.from("audit_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("events")
      .select(eventColumns)
      .order("starts_at", { ascending: false })
      .limit(4),
    supabase
      .from("audit_logs")
      .select("id, actor_user_id, action, target_type, target_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  return {
    data: {
      events: eventsCount.count ?? 0,
      participants: participantsCount.count ?? 0,
      sessions: sessionsCount.count ?? 0,
      auditLogs: auditLogsCount.count ?? 0,
      recentEvents: recentEvents.data ?? [],
      recentAuditLogs: recentAuditLogs.data ?? [],
    },
    error:
      eventsCount.error ||
      participantsCount.error ||
      sessionsCount.error ||
      auditLogsCount.error ||
      recentEvents.error ||
      recentAuditLogs.error,
  };
}

export async function listAdminEvents({
  page = 1,
  pageSize = 10,
  search = "",
  registrationStatus = "all",
} = {}) {
  if (!supabase) return { data: [], count: 0, error: null };

  let query = supabase
    .from("events")
    .select(eventColumns, { count: "exact" })
    .order("starts_at", { ascending: false });

  if (search.trim()) {
    const pattern = `%${search.trim()}%`;
    query = query.or(`name.ilike.${pattern},location_name.ilike.${pattern}`);
  }

  if (registrationStatus !== "all") {
    query = query.eq("registration_status", registrationStatus);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data, error, count } = await query.range(start, end);

  return {
    data: data ?? [],
    count: count ?? 0,
    error,
  };
}

export async function getAdminEvent(eventId) {
  if (!supabase || !eventId) return { data: null, error: null };

  const { data, error } = await supabase
    .from("events")
    .select(eventColumns)
    .eq("id", eventId)
    .maybeSingle();

  return { data, error };
}

export async function saveAdminEvent(eventId, payload) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const query = eventId
    ? supabase.from("events").update(payload).eq("id", eventId)
    : supabase.from("events").insert(payload);

  const { data, error } = await query.select(eventColumns).single();

  if (error || !data) {
    return { data, error };
  }

  await supabase.from("audit_logs").insert({
    action: eventId ? "event.updated" : "event.created",
    target_type: "event",
    target_id: data.id,
    metadata: {
      name: data.name,
      registration_status: data.registration_status,
    },
  });

  return { data, error: null };
}

export async function listEventParticipants({
  eventId,
  page = 1,
  pageSize = 10,
  search = "",
  registrationStatus = "all",
} = {}) {
  if (!supabase || !eventId) return { data: [], count: 0, error: null };

  let matchedUserIds = null;

  if (search.trim()) {
    const { data: profileMatches, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("display_name", `%${search.trim()}%`)
      .limit(200);

    if (profileError) {
      return { data: [], count: 0, error: profileError };
    }

    matchedUserIds = [...new Set(profileMatches?.map((profile) => profile.user_id) ?? [])];
    if (looksLikeUuid(search.trim())) {
      matchedUserIds.push(search.trim());
    }

    if (matchedUserIds.length === 0) {
      return { data: [], count: 0, error: null };
    }
  }

  let registrationQuery = supabase
    .from("event_registrations")
    .select("id, user_id, status, created_at, updated_at", { count: "exact" })
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });

  if (registrationStatus !== "all") {
    registrationQuery = registrationQuery.eq("status", registrationStatus);
  }

  if (matchedUserIds?.length) {
    registrationQuery = registrationQuery.in("user_id", matchedUserIds);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data: registrations, error, count } = await registrationQuery.range(start, end);

  if (error || !registrations?.length) {
    return {
      data: registrations ?? [],
      count: count ?? 0,
      error,
    };
  }

  const userIds = [...new Set(registrations.map((registration) => registration.user_id))];
  const [{ data: profiles }, { data: eventTeams }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, display_name, looking_for_team, open_to_joining_team")
      .in("user_id", userIds),
    supabase.from("teams").select("id, name").eq("event_id", eventId),
  ]);

  const teamIds = eventTeams?.map((team) => team.id) ?? [];
  const { data: memberships } = teamIds.length
    ? await supabase
        .from("team_members")
        .select("user_id, team_id, status")
        .in("user_id", userIds)
        .in("team_id", teamIds)
        .eq("status", "approved")
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const teamMap = new Map((eventTeams ?? []).map((team) => [team.id, team]));
  const membershipMap = new Map((memberships ?? []).map((membership) => [membership.user_id, membership]));

  return {
    data: registrations.map((registration) => {
      const profile = profileMap.get(registration.user_id);
      const membership = membershipMap.get(registration.user_id);
      const team = membership ? teamMap.get(membership.team_id) : null;

      return {
        ...registration,
        display_name: profile?.display_name ?? "Unnamed participant",
        looking_for_team: Boolean(profile?.looking_for_team),
        open_to_joining_team: Boolean(profile?.open_to_joining_team),
        team_name: team?.name ?? null,
        check_in_status:
          registration.status === "Checked in" ? "Checked in" : "Pending",
        last_activity_at: registration.updated_at ?? registration.created_at,
      };
    }),
    count: count ?? 0,
    error: null,
  };
}

export async function listAdminUsers({
  page = 1,
  pageSize = 10,
  search = "",
} = {}) {
  if (!supabase) return { data: [], count: 0, error: null };

  let query = supabase
    .from("profiles")
    .select(
      "user_id, display_name, bio, desired_role, experience_level, looking_for_team, open_to_joining_team, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (search.trim()) {
    if (looksLikeUuid(search.trim())) {
      query = query.or(`display_name.ilike.%${search.trim()}%,user_id.eq.${search.trim()}`);
    } else {
      query = query.ilike("display_name", `%${search.trim()}%`);
    }
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data: profiles, error, count } = await query.range(start, end);

  if (error || !profiles?.length) {
    return { data: profiles ?? [], count: count ?? 0, error };
  }

  const userIds = profiles.map((profile) => profile.user_id);
  const [{ data: roleRows }, { data: registrations }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, roles(name)")
      .in("user_id", userIds),
    supabase
      .from("event_registrations")
      .select("user_id, event_id, status")
      .in("user_id", userIds),
  ]);

  const rolesByUser = new Map();
  for (const row of roleRows ?? []) {
    const values = rolesByUser.get(row.user_id) ?? [];
    if (row.roles?.name && !values.includes(row.roles.name)) {
      values.push(row.roles.name);
    }
    rolesByUser.set(row.user_id, values);
  }

  const registrationCountByUser = new Map();
  for (const registration of registrations ?? []) {
    registrationCountByUser.set(
      registration.user_id,
      (registrationCountByUser.get(registration.user_id) ?? 0) + 1,
    );
  }

  return {
    data: profiles.map((profile) => ({
      ...profile,
      roles: rolesByUser.get(profile.user_id) ?? ["participant"],
      registration_count: registrationCountByUser.get(profile.user_id) ?? 0,
    })),
    count: count ?? 0,
    error: null,
  };
}

export async function listAdminSessions({
  page = 1,
  pageSize = 10,
  search = "",
  provider = "all",
} = {}) {
  if (!supabase) return { data: [], count: 0, error: null };

  let query = supabase
    .from("login_sessions")
    .select("id, user_id, provider, ip_address, user_agent, created_at, last_seen_at", {
      count: "exact",
    })
    .order("last_seen_at", { ascending: false });

  if (provider !== "all") {
    query = query.eq("provider", provider);
  }

  if (search.trim()) {
    if (looksLikeUuid(search.trim())) {
      query = query.eq("user_id", search.trim());
    } else {
      query = query.ilike("user_agent", `%${search.trim()}%`);
    }
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data: sessions, error, count } = await query.range(start, end);

  if (error || !sessions?.length) {
    return { data: sessions ?? [], count: count ?? 0, error };
  }

  const profiles = await getProfilesForUserIds(sessions.map((session) => session.user_id));
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return {
    data: sessions.map((session) => ({
      ...session,
      display_name: profileMap.get(session.user_id)?.display_name ?? "Unknown user",
    })),
    count: count ?? 0,
    error: null,
  };
}

export async function listAdminAuditLogs({
  page = 1,
  pageSize = 10,
  search = "",
} = {}) {
  if (!supabase) return { data: [], count: 0, error: null };

  let query = supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, target_type, target_id, ip_address, metadata, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (search.trim()) {
    query = query.or(`action.ilike.%${search.trim()}%,target_type.ilike.%${search.trim()}%`);
  }

  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;
  const { data: logs, error, count } = await query.range(start, end);

  if (error || !logs?.length) {
    return { data: logs ?? [], count: count ?? 0, error };
  }

  const actorIds = [...new Set(logs.map((log) => log.actor_user_id).filter(Boolean))];
  const profiles = await getProfilesForUserIds(actorIds);
  const profileMap = new Map(profiles.map((profile) => [profile.user_id, profile]));

  return {
    data: logs.map((log) => ({
      ...log,
      actor_name: log.actor_user_id
        ? profileMap.get(log.actor_user_id)?.display_name ?? "Unknown admin"
        : "System",
    })),
    count: count ?? 0,
    error: null,
  };
}

async function getProfilesForUserIds(userIds) {
  if (!supabase || !userIds.length) return [];

  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [...new Set(userIds)]);

  return data ?? [];
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
