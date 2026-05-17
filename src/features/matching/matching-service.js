import { supabase } from "../../lib/supabase/client.js";
import { getProfile } from "../profiles/profile-service.js";
import { listUserTeams } from "../teams/team-service.js";

const profileColumns = "id,user_id,display_name,avatar_url,bio,looking_for_team,open_to_joining_team,github_url,linkedin_url,devpost_url,current_team_id";
const teamColumns = "id,event_id,name,description,project_idea,github_url,devpost_url,recruiting_members,created_by,events(id,name,starts_at)";

export async function getMatchingContext(userId, eventId = null) {
  const [profileResult, teamsResult, registrationsResult] = await Promise.all([
    getProfile(userId),
    listUserTeams(userId),
    listUserEventRegistrations(userId),
  ]);

  if (profileResult.error) return { data: null, error: profileResult.error };
  if (teamsResult.error) return { data: null, error: teamsResult.error };
  if (registrationsResult.error) return { data: null, error: registrationsResult.error };

  const registrations = (registrationsResult.data ?? []).filter((row) => row.status !== "Cancelled");
  const selectedEventId = eventId ?? registrations[0]?.event_id ?? null;
  const recruitingTeams = (teamsResult.data ?? []).filter(
    (team) => team.recruiting_members && (!selectedEventId || team.event_id === selectedEventId),
  );
  const actors = [];

  if (selectedEventId && profileResult.data) {
    actors.push({ type: "user", id: userId, label: "Me", profile: profileResult.data, event_id: selectedEventId });
  }

  for (const team of recruitingTeams) {
    actors.push({ type: "team", id: team.id, label: team.name, team });
  }

  return {
    data: {
      actors,
      selectedEventId,
      profile: profileResult.data,
      registrations,
      teams: teamsResult.data ?? [],
    },
    error: null,
  };
}

export async function listCandidates(actor, userId, eventId = null) {
  if (!supabase || !actor) return { data: [], error: null };

  const selectedEventId = eventId ?? actor.event_id ?? actor.team?.event_id ?? null;

  if (!selectedEventId) return { data: [], error: null };

  const swipedResult = await listSwipedTargets(actor, selectedEventId);
  if (swipedResult.error) return { data: [], error: swipedResult.error };

  const swiped = swipedResult.data;

  if (actor.type === "user") {
    const [teamsResult, registrationsResult] = await Promise.all([
      supabase
        .from("teams")
        .select(teamColumns)
        .eq("recruiting_members", true)
        .eq("event_id", selectedEventId)
        .neq("created_by", userId)
        .limit(25),
      listEventRegistrations(selectedEventId),
    ]);

    if (teamsResult.error) return { data: [], error: teamsResult.error };
    if (registrationsResult.error) return { data: [], error: registrationsResult.error };

    const registeredUserIds = (registrationsResult.data ?? [])
      .map((row) => row.user_id)
      .filter((registeredUserId) => registeredUserId && registeredUserId !== userId && !swiped.userIds.has(registeredUserId));
    const profilesResult = await listProfilesByUserIds(registeredUserIds);

    if (profilesResult.error) return { data: [], error: profilesResult.error };

    const teams = (teamsResult.data ?? [])
      .filter((team) => !swiped.teamIds.has(team.id))
      .map((team) => ({ type: "team", id: team.id, event_id: team.event_id, team }));

    const profiles = (profilesResult.data ?? [])
      .map((profile) => ({
        type: "user",
        id: profile.user_id,
        event_id: selectedEventId,
        profile,
      }));

    return {
      data: [...teams, ...profiles],
      error: null,
    };
  }

  const registrationsResult = await listEventRegistrations(selectedEventId);
  if (registrationsResult.error) return { data: [], error: registrationsResult.error };

  const registeredUserIds = (registrationsResult.data ?? [])
    .map((row) => row.user_id)
    .filter((registeredUserId) => registeredUserId && registeredUserId !== userId && !swiped.userIds.has(registeredUserId));
  const profilesResult = await listProfilesByUserIds(registeredUserIds);

  if (profilesResult.error) return { data: [], error: profilesResult.error };

  return {
    data: (profilesResult.data ?? [])
      .map((profile) => ({ type: "user", id: profile.user_id, event_id: actor.team.event_id, profile })),
    error: null,
  };
}

export async function createSwipe(actor, candidate, direction) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };
  if (isSelfSwipe(actor, candidate)) {
    return { data: null, error: new Error("You cannot swipe on your own profile.") };
  }

  const eventId = candidate.event_id ?? actor.team?.event_id ?? await getDefaultEventId();

  if (!eventId) {
    return { data: null, error: new Error("Select an event or team before matching with this candidate.") };
  }

  const payload = {
    event_id: eventId,
    direction,
    actor_user_id: actor.type === "user" ? actor.id : null,
    actor_team_id: actor.type === "team" ? actor.id : null,
    target_user_id: candidate.type === "user" ? candidate.id : null,
    target_team_id: candidate.type === "team" ? candidate.id : null,
  };

  if (payload.actor_user_id && payload.actor_user_id === payload.target_user_id) {
    return { data: null, error: new Error("You cannot swipe on your own profile.") };
  }

  if (payload.actor_team_id && payload.actor_team_id === payload.target_team_id) {
    return { data: null, error: new Error("A team cannot swipe on itself.") };
  }

  const { data, error } = await supabase.from("swipes").insert(payload).select().single();
  if (error || direction !== "right") return { data, error };

  const matchResult = await createMutualMatch(actor, candidate, eventId);
  return { data: { swipe: data, match: matchResult.data }, error: matchResult.error };
}

function isSelfSwipe(actor, candidate) {
  return (
    (actor.type === "user" && candidate.type === "user" && actor.id === candidate.id) ||
    (actor.type === "team" && candidate.type === "team" && actor.id === candidate.id)
  );
}

async function createMutualMatch(actor, candidate, eventId) {
  const reciprocal = await findReciprocalRightSwipe(actor, candidate);
  if (reciprocal.error || !reciprocal.data) return reciprocal;

  const payload = buildMatchPayload(actor, candidate, eventId);
  if (!payload) return { data: null, error: null };

  const { data, error } = await supabase
    .from("matches")
    .insert(payload)
    .select()
    .single();

  if (error?.code === "23505") return { data: null, error: null };
  return { data, error };
}

async function findReciprocalRightSwipe(actor, candidate) {
  let query = supabase.from("swipes").select("id").eq("direction", "right").limit(1);

  if (actor.type === "user" && candidate.type === "team") {
    query = query.eq("actor_team_id", candidate.id).eq("target_user_id", actor.id);
  } else if (actor.type === "team" && candidate.type === "user") {
    query = query.eq("actor_user_id", candidate.id).eq("target_team_id", actor.id);
  } else if (actor.type === "user" && candidate.type === "user") {
    query = query.eq("actor_user_id", candidate.id).eq("target_user_id", actor.id);
  } else {
    return { data: null, error: null };
  }

  const { data, error } = await query.maybeSingle();
  return { data, error };
}

function buildMatchPayload(actor, candidate, eventId) {
  if (actor.type === "user" && candidate.type === "team") {
    return {
      event_id: eventId,
      match_type: "user_team",
      user_a_id: actor.id,
      team_id: candidate.id,
    };
  }

  if (actor.type === "team" && candidate.type === "user") {
    return {
      event_id: eventId,
      match_type: "user_team",
      user_a_id: candidate.id,
      team_id: actor.id,
    };
  }

  if (actor.type === "user" && candidate.type === "user") {
    return {
      event_id: eventId,
      match_type: "user_user",
      user_a_id: actor.id,
      user_b_id: candidate.id,
    };
  }

  return null;
}

async function getDefaultEventId() {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .neq("registration_status", "draft")
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

async function listUserEventRegistrations(userId) {
  if (!supabase || !userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,user_id,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

async function listEventRegistrations(eventId) {
  if (!supabase || !eventId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("event_registrations")
    .select("event_id,user_id,status")
    .eq("event_id", eventId)
    .neq("status", "Cancelled");

  return { data: data ?? [], error };
}

async function listProfilesByUserIds(userIds) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (!supabase || uniqueUserIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .in("user_id", uniqueUserIds)
    .order("display_name", { ascending: true });

  return { data: data ?? [], error };
}

async function listSwipedTargets(actor, eventId) {
  let query = supabase.from("swipes").select("target_user_id,target_team_id");
  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = actor.type === "user"
    ? await query.eq("actor_user_id", actor.id)
    : await query.eq("actor_team_id", actor.id);

  if (error) return { data: null, error };

  return {
    data: {
      userIds: new Set((data ?? []).map((row) => row.target_user_id).filter(Boolean)),
      teamIds: new Set((data ?? []).map((row) => row.target_team_id).filter(Boolean)),
    },
    error: null,
  };
}
