import { supabase } from "../../lib/supabase/client.js";
import { getProfile } from "../profiles/profile-service.js";
import { listUserTeams } from "../teams/team-service.js";

const profileColumns = "id,user_id,display_name,avatar_url,bio,desired_role,experience_level,looking_for_team,open_to_joining_team,availability,github_url,linkedin_url,devpost_url,current_team_id";
const teamColumns = "id,event_id,name,description,project_idea,github_url,devpost_url,recruiting_members,created_by,events(id,name,starts_at)";

export async function getMatchingContext(userId) {
  const [profileResult, teamsResult] = await Promise.all([
    getProfile(userId),
    listUserTeams(userId),
  ]);

  if (profileResult.error) return { data: null, error: profileResult.error };
  if (teamsResult.error) return { data: null, error: teamsResult.error };

  const recruitingTeams = (teamsResult.data ?? []).filter((team) => team.recruiting_members);
  const actors = [];

  if (profileResult.data?.looking_for_team || profileResult.data?.open_to_joining_team) {
    actors.push({ type: "user", id: userId, label: "Me", profile: profileResult.data });
  }

  for (const team of recruitingTeams) {
    actors.push({ type: "team", id: team.id, label: team.name, team });
  }

  return {
    data: {
      actors,
      profile: profileResult.data,
      teams: teamsResult.data ?? [],
    },
    error: null,
  };
}

export async function listCandidates(actor, userId) {
  if (!supabase || !actor) return { data: [], error: null };

  const swipedResult = await listSwipedTargets(actor);
  if (swipedResult.error) return { data: [], error: swipedResult.error };

  const swiped = swipedResult.data;

  if (actor.type === "user") {
    const { data, error } = await supabase
      .from("teams")
      .select(teamColumns)
      .eq("recruiting_members", true)
      .neq("created_by", userId)
      .limit(25);

    if (error) return { data: [], error };

    return {
      data: (data ?? [])
        .filter((team) => !swiped.teamIds.has(team.id))
        .map((team) => ({ type: "team", id: team.id, event_id: team.event_id, team })),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("looking_for_team", true)
    .neq("user_id", userId)
    .limit(25);

  if (error) return { data: [], error };

  return {
    data: (data ?? [])
      .filter((profile) => !swiped.userIds.has(profile.user_id))
      .map((profile) => ({ type: "user", id: profile.user_id, event_id: actor.team.event_id, profile })),
    error: null,
  };
}

export async function createSwipe(actor, candidate, direction) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const payload = {
    event_id: candidate.event_id,
    direction,
    actor_user_id: actor.type === "user" ? actor.id : null,
    actor_team_id: actor.type === "team" ? actor.id : null,
    target_user_id: candidate.type === "user" ? candidate.id : null,
    target_team_id: candidate.type === "team" ? candidate.id : null,
  };

  const { data, error } = await supabase.from("swipes").insert(payload).select().single();
  if (error || direction !== "right") return { data, error };

  const matchResult = await createMutualMatch(actor, candidate);
  return { data: { swipe: data, match: matchResult.data }, error: matchResult.error };
}

async function createMutualMatch(actor, candidate) {
  const reciprocal = await findReciprocalRightSwipe(actor, candidate);
  if (reciprocal.error || !reciprocal.data) return reciprocal;

  const payload = buildMatchPayload(actor, candidate);
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

function buildMatchPayload(actor, candidate) {
  if (actor.type === "user" && candidate.type === "team") {
    return {
      event_id: candidate.event_id,
      match_type: "user_team",
      user_a_id: actor.id,
      team_id: candidate.id,
    };
  }

  if (actor.type === "team" && candidate.type === "user") {
    return {
      event_id: candidate.event_id,
      match_type: "user_team",
      user_a_id: candidate.id,
      team_id: actor.id,
    };
  }

  if (actor.type === "user" && candidate.type === "user") {
    return {
      event_id: candidate.event_id,
      match_type: "user_user",
      user_a_id: actor.id,
      user_b_id: candidate.id,
    };
  }

  return null;
}

async function listSwipedTargets(actor) {
  const query = supabase.from("swipes").select("target_user_id,target_team_id");
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
