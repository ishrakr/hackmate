import { supabase } from "../../lib/supabase/client.js";

const eventColumns = "id,name,description,starts_at,ends_at,location_name,address,latitude,longitude,capacity,registration_status,banner_url,organizer_id";

export async function listEvents() {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("events")
    .select(eventColumns)
    .order("starts_at", { ascending: true });

  return { data: data ?? [], error };
}

export async function getEvent(eventId) {
  if (!supabase) return { data: null, error: null };

  const { data, error } = await supabase
    .from("events")
    .select(eventColumns)
    .eq("id", eventId)
    .maybeSingle();

  return { data, error };
}

export async function getEventFaqs(eventId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("faqs")
    .select("id,question,answer,category,visible")
    .eq("event_id", eventId)
    .eq("visible", true)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  return { data: data ?? [], error };
}

export async function getEventSchedule(eventId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("schedules")
    .select("id,title,description,starts_at,ends_at,location,category,speaker_or_host,link_url")
    .eq("event_id", eventId)
    .order("starts_at", { ascending: true });

  return { data: data ?? [], error };
}

export async function getEventAnnouncements(eventId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,body,priority,created_at")
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(5);

  return { data: data ?? [], error };
}

export async function upsertFeedback(feedback) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("feedback")
    .upsert(feedback, { onConflict: "event_id,user_id" })
    .select()
    .single();

  return { data, error };
}
