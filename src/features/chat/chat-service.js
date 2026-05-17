import { supabase } from "../../lib/supabase/client.js";

const chatColumns = "id,event_id,team_id,type,created_at";
const messageColumns = "id,chat_id,sender_id,body,created_at,edited_at,deleted_at";

export async function getOrCreateChat({ eventId = null, teamId = null, type }) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const existingResult = await findChat({ eventId, teamId, type });
  if (existingResult.error || existingResult.data) return existingResult;

  const { data, error } = await supabase
    .from("chats")
    .insert({
      event_id: eventId,
      team_id: teamId,
      type,
    })
    .select(chatColumns)
    .single();

  if (isUniqueConflict(error)) {
    return findChat({ eventId, teamId, type });
  }

  return { data, error };
}

export async function listChatMessages(chatId) {
  if (!supabase) return { data: [], error: null };

  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select(messageColumns)
    .eq("chat_id", chatId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return { data: [], error };

  const profiles = await getSenderProfiles(messages ?? []);

  return {
    data: (messages ?? []).map((message) => ({
      ...message,
      sender_profile: profiles.get(message.sender_id) ?? null,
    })),
    error: null,
  };
}

export async function sendChatMessage({ body, chatId, senderId }) {
  if (!supabase) {
    return { data: null, error: new Error("Supabase is not configured.") };
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      body,
      chat_id: chatId,
      sender_id: senderId,
    })
    .select(messageColumns)
    .single();

  return { data, error };
}

export function subscribeToChatMessages(chatId, onChange) {
  if (!supabase || !chatId) return () => {};

  const channel = supabase
    .channel(`chat:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        filter: `chat_id=eq.${chatId}`,
        schema: "public",
        table: "chat_messages",
      },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

async function findChat({ eventId, teamId, type }) {
  let query = supabase
    .from("chats")
    .select(chatColumns)
    .eq("type", type)
    .order("created_at", { ascending: true })
    .limit(1);

  if (type === "team") {
    query = query.eq("team_id", teamId);
  } else {
    query = eventId ? query.eq("event_id", eventId) : query.is("event_id", null);
    query = teamId ? query.eq("team_id", teamId) : query.is("team_id", null);
  }

  const { data, error } = await query.maybeSingle();

  return { data, error };
}

async function getSenderProfiles(messages) {
  const senderIds = [
    ...new Set(messages.map((message) => message.sender_id).filter(Boolean)),
  ];

  if (senderIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,display_name,avatar_url")
    .in("user_id", senderIds);

  if (error) return new Map();

  return new Map((data ?? []).map((profile) => [profile.user_id, profile]));
}

function isUniqueConflict(error) {
  return error?.code === "23505";
}
