import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/auth-context.jsx";
import {
  getEvent,
  getEventAnnouncements,
  getEventFaqs,
  getEventSchedule,
  listEvents,
  listUserEventRegistrations,
} from "../events/event-service.js";
import {
  answerEventQuestion,
  getSuggestedBotQuestions,
} from "./chatbot-service.js";

export function EventChatbot({ compact = false }) {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [draft, setDraft] = useState("");
  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState("");
  const [events, setEvents] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const endRef = useRef(null);

  const suggestions = useMemo(() => getSuggestedBotQuestions(event), [event]);
  const searchKey = searchParams.toString();

  useEffect(() => {
    let isMounted = true;

    async function loadEvents() {
      setStatus("loading");
      const [eventResult, registrationResult] = await Promise.all([
        listEvents(),
        listUserEventRegistrations(user.id),
      ]);

      if (!isMounted) return;

      const activeEventIds = new Set(
        (registrationResult.data ?? [])
          .filter((registration) => registration.status !== "Cancelled")
          .map((registration) => registration.event_id),
      );
      const availableEvents = (eventResult.data ?? []).filter((eventChoice) => activeEventIds.has(eventChoice.id));
      const requestedEventId = new URLSearchParams(searchKey).get("event");
      const fallbackEventId = availableEvents[0]?.id ?? "";
      const nextEventId =
        availableEvents.some((eventChoice) => eventChoice.id === requestedEventId)
          ? requestedEventId
          : fallbackEventId;

      setEvents(availableEvents);
      setEventId(nextEventId);
      setMessage(eventResult.error?.message ?? registrationResult.error?.message ?? "");
      setStatus(nextEventId ? "loadingEvent" : "ready");

      if (!nextEventId) {
        setMessages([makeBotMessage("Register for an event first. I can only answer from events you are participating in.")]);
      }
    }

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [searchKey, user.id]);

  useEffect(() => {
    if (!eventId) return undefined;

    let isMounted = true;

    async function loadEventContext() {
      setStatus("loadingEvent");
      setMessage("");

      const [
        eventResult,
        faqResult,
        scheduleResult,
        announcementResult,
      ] = await Promise.all([
        getEvent(eventId),
        getEventFaqs(eventId),
        getEventSchedule(eventId),
        getEventAnnouncements(eventId),
      ]);

      if (!isMounted) return;

      setEvent(eventResult.data);
      setFaqs(faqResult.data ?? []);
      setSchedule(scheduleResult.data ?? []);
      setAnnouncements(announcementResult.data ?? []);
      setMessage(
        eventResult.error?.message ||
          faqResult.error?.message ||
          scheduleResult.error?.message ||
          announcementResult.error?.message ||
          "",
      );
      setMessages([
        makeBotMessage(
          eventResult.data
            ? `I am ready for questions about ${eventResult.data.name}.`
            : "I could not load that event yet.",
        ),
      ]);
      setStatus("ready");
    }

    loadEventContext();

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  function handleEventChange(nextEventId) {
    setEventId(nextEventId);
    setSearchParams(nextEventId ? { event: nextEventId } : {});
  }

  function handleSubmit(event) {
    event.preventDefault();
    askQuestion(draft);
  }

  function askQuestion(question) {
    const prompt = question.trim();
    if (!prompt || status !== "ready") return;

    const reply = answerEventQuestion({
      announcements,
      event,
      faqs,
      question: prompt,
      schedule,
    });

    setDraft("");
    setMessages((current) => [
      ...current,
      makeUserMessage(prompt),
      makeBotMessage(reply.text, reply),
    ]);
  }

  return (
    <section className={`chat-panel native-card bot-panel${compact ? " chat-panel-compact" : ""}`} aria-label="Hackmate bot">
      <div className="chat-panel-header">
        <div>
          <p className="card-label">Bot</p>
          <h2>Hackmate Bot</h2>
        </div>
        <span className={`live-dot${status === "ready" ? " is-live" : ""}`}>
          {status === "ready" ? "Ready" : "Loading"}
        </span>
      </div>

      {events.length > 0 ? (
        <label className="form-field compact-selector" htmlFor="botEvent">
          <span>Event</span>
          <select
            id="botEvent"
            value={eventId}
            onChange={(event) => handleEventChange(event.target.value)}
          >
            {events.map((eventChoice) => (
              <option key={eventChoice.id} value={eventChoice.id}>
                {eventChoice.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {message ? (
        <p className="auth-error chat-error" role="alert">
          {message}
        </p>
      ) : null}

      <div className="message-list bot-message-list" aria-live="polite">
        {messages.map((item) => (
          <BotMessage key={item.id} message={item} eventId={eventId} />
        ))}
        <div ref={endRef} />
      </div>

      {status === "ready" ? (
        <div className="suggestion-row" aria-label="Suggested questions">
          {suggestions.map((suggestion) => (
            <button
              className="suggestion-chip"
              key={suggestion}
              type="button"
              onClick={() => askQuestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          aria-label="Ask Hackmate Bot"
          disabled={status !== "ready"}
          placeholder={status === "ready" ? "Ask about this event..." : "Loading event data..."}
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
          disabled={!draft.trim() || status !== "ready"}
          type="submit"
        >
          Ask
        </button>
      </form>
    </section>
  );
}

function BotMessage({ eventId, message }) {
  const isUser = message.role === "user";

  return (
    <article className={`chat-message${isUser ? " is-mine" : ""}`}>
      {!isUser ? (
        <span className="message-avatar bot-avatar" aria-hidden="true">
          H
        </span>
      ) : null}
      <div>
        <div className={`message-bubble ${isUser ? "outgoing" : "incoming"}`}>
          {message.body}
        </div>
        {!isUser ? (
          <div className="bot-meta-row">
            <span>{message.source}</span>
            {message.escalate ? (
              <Link to={eventId ? `/chat/support?event=${eventId}` : "/chat/support"}>
                Ask support
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function makeBotMessage(body, options = {}) {
  return {
    body,
    escalate: Boolean(options.escalate),
    id: `bot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "bot",
    source: options.source ?? "Hackmate Bot",
  };
}

function makeUserMessage(body) {
  return {
    body,
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "user",
  };
}
