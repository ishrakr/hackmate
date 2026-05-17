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

export async function countLiveEvents() {
  if (!supabase) return { count: 0, error: null };

  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .in("registration_status", ["open", "waitlist"]);

  return { count: count ?? 0, error };
}

export async function listUserEventRegistrations(userId) {
  if (!supabase || !userId) return { data: [], error: null };

  const { data, error } = await supabase
    .from("event_registrations")
    .select("id,event_id,user_id,status,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return { data: data ?? [], error };
}

export async function registerForEvent(eventId, userId) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .upsert(
      { event_id: eventId, user_id: userId, status: "Registered" },
      { onConflict: "event_id,user_id" },
    )
    .select("id,event_id,user_id,status,created_at")
    .single();

  return { data, error };
}

export async function leaveEvent(eventId, userId) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("event_registrations")
    .update({ status: "Cancelled" })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .select("id,event_id,user_id,status,created_at")
    .single();

  return { data, error };
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

export async function getEventMapMarkers(eventId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("event_map_markers")
    .select("id,label,description,marker_type,latitude,longitude,floor,sort_order,visible")
    .eq("event_id", eventId)
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  return { data: data ?? [], error };
}

export async function getEventRoomAreas(eventId) {
  if (!supabase) return { data: [], error: null };

  const { data, error } = await supabase
    .from("event_room_areas")
    .select("id,name,description,floor,area_type,sort_order,visible")
    .eq("event_id", eventId)
    .eq("visible", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return { data: data ?? [], error };
}

export function subscribeToEventAnnouncements(eventId, callback) {
  if (!supabase || !eventId) return () => {};

  const channel = supabase
    .channel(`event-announcements:${eventId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "announcements",
      },
      callback,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
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
