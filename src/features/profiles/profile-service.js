import { supabase } from "../../lib/supabase/client.js";

export async function getProfile(userId) {
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return { data, error };
}

export async function upsertProfile(profile) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "user_id" })
    .select()
    .single();

  return { data, error };
}

export function buildDefaultProfile(user) {
  return {
    user_id: user.id,
    display_name: getDefaultDisplayName(user),
    avatar_url: user.user_metadata?.avatar_url ?? null,
    github_url: getGithubUrl(user),
    looking_for_team: false,
    open_to_joining_team: false,
    contact_preferences: {},
  };
}

function getDefaultDisplayName(user) {
  return (
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.user_metadata?.user_name ||
    user.email?.split("@")[0] ||
    "Hackmate user"
  );
}

function getGithubUrl(user) {
  const githubName = user.user_metadata?.user_name || user.user_metadata?.preferred_username;
  return githubName ? `https://github.com/${githubName}` : null;
}
