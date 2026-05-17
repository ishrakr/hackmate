import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import { listEvents, listUserEventRegistrations } from "../events/event-service.js";
import {
  getOrCreateChat,
  listChatMessages,
  sendChatMessage,
  subscribeToChatMessages,
} from "./chat-service.js";

export function ChatRoom({ eventId = null, teamId = null, title, type }) {
  const { user } = useAuth();
  const [chat, setChat] = useState(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("loading");
  const endRef = useRef(null);
  const realtimeRef = useRef({ broadcast: () => {} });

  useEffect(() => {
    let isMounted = true;
    let realtime = { unsubscribe: () => {} };

    async function loadMessages(chatId) {
      const result = await listChatMessages(chatId);
      if (!isMounted) return;

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      setMessages(result.data ?? []);
    }

    async function connectChat() {
      setStatus("loading");
      setMessage("");
      setMessages([]);
      setChat(null);

      const chatResult = await getOrCreateChat({ eventId, teamId, type });

      if (!isMounted) return;

      if (chatResult.error) {
        setMessage(getChatErrorText(chatResult.error, type));
        setStatus("error");
        return;
      }

      if (!chatResult.data) {
        setMessage("Chat channel is unavailable right now.");
        setStatus("error");
        return;
      }

      setChat(chatResult.data);
      await loadMessages(chatResult.data.id);

      if (!isMounted) return;

      realtime = subscribeToChatMessages(
        chatResult.data.id,
        (incomingMessage) => {
          setMessages((current) => upsertChatMessage(current, incomingMessage));
        },
        (realtimeStatus) => {
          if (!isMounted) return;
          if (realtimeStatus === "CHANNEL_ERROR" || realtimeStatus === "TIMED_OUT") {
            setMessage("Realtime websocket connection dropped. Reconnecting on the next reload.");
          }
        },
      );
      realtimeRef.current = realtime;
      setStatus("ready");
    }

    connectChat();

    return () => {
      isMounted = false;
      realtime.unsubscribe();
      realtimeRef.current = { broadcast: () => {} };
    };
  }, [eventId, teamId, type]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  async function handleSubmit(event) {
    event.preventDefault();

    const body = draft.trim();
    if (!body || !chat || !user || isSending) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      body,
      chat_id: chat.id,
      created_at: new Date().toISOString(),
      id: optimisticId,
      optimistic: true,
      sender_id: user.id,
      sender_profile: getUserProfilePreview(user),
    };

    setDraft("");
    setIsSending(true);
    setMessage("");
    setMessages((current) => [...current, optimisticMessage]);

    const { data, error } = await sendChatMessage({
      body,
      chatId: chat.id,
      senderId: user.id,
    });

    if (error) {
      setDraft(body);
      setMessage(getSendErrorText(error, type));
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId),
      );
    }

    if (data) {
      setMessages((current) => upsertChatMessage(current, data, optimisticId));
      realtimeRef.current.broadcast(data);
    }

    setIsSending(false);
  }

  const isReady = status === "ready";

  return (
    <section className="chat-panel" aria-label={`${title} messages`}>
      <div className="chat-panel-header">
        <div>
          <p className="card-label">{type}</p>
          <h2>{title}</h2>
        </div>
        <span className={`live-dot${isReady ? " is-live" : ""}`}>
          {isReady ? "Live" : "Connecting"}
        </span>
      </div>

      <div className="message-list" aria-live="polite">
        {status === "loading" ? (
          <ChatSystemMessage body="Opening the channel." />
        ) : null}
        {status === "error" ? <ChatSystemMessage body={message} /> : null}
        {isReady && messages.length === 0 ? (
          <ChatSystemMessage body="No messages yet. Start the thread." />
        ) : null}
        {messages.map((item) => (
          <ChatMessage key={item.id} message={item} userId={user?.id} />
        ))}
        <div ref={endRef} />
      </div>

      {message && status !== "error" ? (
        <p className="auth-error chat-error" role="alert">
          {message}
        </p>
      ) : null}

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          aria-label={`Message ${title}`}
          disabled={!isReady || isSending}
          placeholder={isReady ? `Message ${title}` : "Waiting for channel..."}
          rows="1"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          className="send-action"
          disabled={!draft.trim() || !isReady || isSending}
          type="submit"
        >
          {isSending ? "..." : "↑"}
        </button>
      </form>
    </section>
  );
}

export function SupportChatRoom() {
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState(
    searchParams.get("event") ?? "",
  );
  const [status, setStatus] = useState("loading");
  const searchKey = searchParams.toString();

  useEffect(() => {
    let isMounted = true;

    async function loadEventChoices() {
      const { data, error } = await listEvents();

      if (!isMounted) return;

      setEvents(data ?? []);
      setMessage(error?.message ?? "");

      const requestedEventId = new URLSearchParams(searchKey).get("event");
      const fallbackEventId = data?.[0]?.id ?? "";
      const nextEventId =
        data?.some((event) => event.id === requestedEventId)
          ? requestedEventId
          : fallbackEventId;

      setSelectedEventId(nextEventId);
      setStatus("ready");
    }

    loadEventChoices();

    return () => {
      isMounted = false;
    };
  }, [searchKey]);

  function handleEventChange(event) {
    const nextEventId = event.target.value;
    setSelectedEventId(nextEventId);
    setSearchParams(nextEventId ? { event: nextEventId } : {});
  }

  if (status === "loading") {
    return <ChatShellNotice body="Loading support channels." />;
  }

  if (message) {
    return <ChatShellNotice body={message} tone="error" />;
  }

  if (events.length === 0) {
    return <ChatShellNotice body="No events are available for support chat yet." />;
  }

  return (
    <>
      <section className="native-card compact-card chat-channel-picker">
        <label className="form-field" htmlFor="supportEvent">
          <span>Event</span>
          <select
            id="supportEvent"
            value={selectedEventId}
            onChange={handleEventChange}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {selectedEventId ? (
        <ChatRoom
          key={selectedEventId}
          eventId={selectedEventId}
          title="Organizer support"
          type="support"
        />
      ) : null}
    </>
  );
}

export function EventChatRoom({ title, type = "lobby" }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [message, setMessage] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get("event") ?? "");
  const [status, setStatus] = useState("loading");
  const searchKey = searchParams.toString();

  useEffect(() => {
    let isMounted = true;

    async function loadEventChoices() {
      setStatus("loading");
      const [eventResult, registrationResult] = await Promise.all([
        listEvents(),
        listUserEventRegistrations(user.id),
      ]);

      if (!isMounted) return;

      const registeredIds = new Set((registrationResult.data ?? []).map((row) => row.event_id));
      const registeredEvents = (eventResult.data ?? []).filter((event) => registeredIds.has(event.id));
      const requestedEventId = new URLSearchParams(searchKey).get("event");
      const fallbackEventId = registeredEvents[0]?.id ?? "";
      const nextEventId = registeredEvents.some((event) => event.id === requestedEventId)
        ? requestedEventId
        : fallbackEventId;

      setEvents(registeredEvents);
      setRegistrations(registrationResult.data ?? []);
      setSelectedEventId(nextEventId);
      setMessage(eventResult.error?.message ?? registrationResult.error?.message ?? "");
      setStatus("ready");
    }

    loadEventChoices();

    return () => {
      isMounted = false;
    };
  }, [searchKey, user.id]);

  function handleEventChange(event) {
    const nextEventId = event.target.value;
    setSelectedEventId(nextEventId);
    setSearchParams(nextEventId ? { event: nextEventId } : {});
  }

  if (status === "loading") {
    return <ChatShellNotice body="Loading your event channels." />;
  }

  if (message) {
    return <ChatShellNotice body={message} tone="error" />;
  }

  if (events.length === 0 || registrations.length === 0) {
    return <ChatShellNotice body="Register for an event first to unlock its lobby and support chat." />;
  }

  return (
    <>
      <EventChannelPicker
        events={events}
        selectedEventId={selectedEventId}
        onChange={handleEventChange}
      />
      {selectedEventId ? (
        <ChatRoom
          key={`${type}-${selectedEventId}`}
          eventId={selectedEventId}
          title={title}
          type={type}
        />
      ) : null}
    </>
  );
}

function ChatMessage({ message, userId }) {
  const isMine = message.sender_id === userId;
  const senderName = getSenderName(message, isMine);

  return (
    <article className={`chat-message${isMine ? " is-mine" : ""}`}>
      {!isMine ? (
        <span className="message-avatar" aria-hidden="true">
          {senderName.charAt(0).toUpperCase()}
        </span>
      ) : null}
      <div>
        <div className={`message-bubble ${isMine ? "outgoing" : "incoming"}`}>
          {message.body}
        </div>
        <p className="message-meta">
          {senderName} at {formatMessageTime(message.created_at)}
          {message.optimistic ? " - sending" : ""}
        </p>
      </div>
    </article>
  );
}

function ChatSystemMessage({ body }) {
  return <p className="chat-system-message">{body}</p>;
}

function EventChannelPicker({ events, selectedEventId, onChange }) {
  const selectedEvent = events.find((event) => event.id === selectedEventId);

  return (
    <section className="chat-event-card">
      <div>
        <p className="card-label">Event channel</p>
        <h2>{selectedEvent?.name ?? "Choose event"}</h2>
      </div>
      <label className="form-field compact-selector" htmlFor="chatEvent">
        <span>Switch event</span>
        <select id="chatEvent" value={selectedEventId} onChange={onChange}>
          {events.map((event) => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </label>
    </section>
  );
}

function ChatShellNotice({ body, tone = "default" }) {
  return (
    <section className="native-card compact-card">
      <p className={tone === "error" ? "auth-error" : undefined}>{body}</p>
    </section>
  );
}

function upsertChatMessage(messages, nextMessage, replaceId = null) {
  const withoutOld = messages.filter((message) => {
    if (replaceId && message.id === replaceId) return false;
    return message.id !== nextMessage.id;
  });

  return [...withoutOld, nextMessage].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function getSenderName(message, isMine) {
  if (isMine) return "You";
  return message.sender_profile?.display_name ?? "Hackmate user";
}

function getUserProfilePreview(user) {
  return {
    avatar_url: user?.user_metadata?.avatar_url ?? null,
    display_name:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.user_name ||
      user?.email?.split("@")[0] ||
      "You",
  };
}

function formatMessageTime(value) {
  if (!value) return "now";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getChatErrorText(error, type) {
  if (error?.code === "42501") {
    if (type === "team") {
      return "This team channel is available only to approved team members.";
    }

    if (type === "support") {
      return "Support chat requires event registration or organizer access.";
    }

    return "You do not have access to this chat yet.";
  }

  return error?.message ?? "Chat is unavailable right now.";
}

function getSendErrorText(error, type) {
  if (error?.code === "42501") {
    return type === "support"
      ? "You need event access before sending support messages."
      : "You do not have permission to send in this channel.";
  }

  return error?.message ?? "Message could not be sent.";
}
