import { supabase } from "../../lib/supabase/client.js";

const teamColumns = "id,event_id,name,description,project_idea,github_url,devpost_url,recruiting_members,created_by,created_at,updated_at";

export async function listUserTeams(userId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("team_members")
    .select(`id,role,status,teams(${teamColumns},events(id,name,starts_at))`)
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error };

  return {
    data: (data ?? []).map((row) => ({ ...row.teams, membership: { id: row.id, role: row.role, status: row.status } })).filter(Boolean),
    error: null,
  };
}

export async function createTeam({ team, userId, role }) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const { data: createdTeam, error: teamError } = await supabase
    .from("teams")
    .insert({ ...team, created_by: userId })
    .select(teamColumns)
    .single();

  if (teamError) return { data: null, error: teamError };

  const { error: memberError } = await supabase.from("team_members").insert({
    team_id: createdTeam.id,
    user_id: userId,
    role: role || "Team lead",
    status: "approved",
  });

  if (memberError) return { data: createdTeam, error: memberError };

  await supabase
    .from("profiles")
    .update({ current_team_id: createdTeam.id, looking_for_team: false, open_to_joining_team: false })
    .eq("user_id", userId);

  return { data: createdTeam, error: null };
}

export async function getTeam(teamId) {
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("teams")
    .select(`${teamColumns},events(id,name,starts_at,location_name),team_members(id,user_id,role,status,profiles(display_name,avatar_url,desired_role))`)
    .eq("id", teamId)
    .maybeSingle();

  return { data, error };
}

export async function updateTeam(teamId, updates) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const { data, error } = await supabase
    .from("teams")
    .update(updates)
    .eq("id", teamId)
    .select(teamColumns)
    .single();

  return { data, error };
}

export async function createTeamJoinToken(teamId, userId) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

  const { data, error } = await supabase
    .from("team_qr_tokens")
    .insert({
      team_id: teamId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: userId,
    })
    .select("id,team_id,expires_at")
    .single();

  if (error) return { data: null, error };

  return { data: { ...data, token }, error: null };
}

export async function getTeamByJoinToken(token) {
  if (!supabase) return { data: null, error: null };

  const tokenHash = await hashToken(token);
  const { data, error } = await supabase
    .from("team_qr_tokens")
    .select(`id,team_id,expires_at,teams(${teamColumns},events(id,name,starts_at,location_name))`)
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) return { data: null, error };
  if (!data) return { data: null, error: null };

  return { data: { token: data, team: data.teams }, error: null };
}

export async function createJoinRequest({ teamId, userId, message }) {
  if (!supabase) return { data: null, error: new Error("Supabase is not configured.") };

  const { data, error } = await supabase
    .from("team_join_requests")
    .upsert(
      {
        team_id: teamId,
        user_id: userId,
        status: "pending",
        message: message?.trim() || null,
      },
      { onConflict: "team_id,user_id" },
    )
    .select("id,team_id,user_id,status,message")
    .single();

  return { data, error };
}

async function hashToken(token) {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
