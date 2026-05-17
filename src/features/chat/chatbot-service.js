const stopWords = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "at",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "or",
  "the",
  "there",
  "to",
  "what",
  "when",
  "where",
  "will",
  "with",
]);

export function answerEventQuestion({
  announcements = [],
  event,
  faqs = [],
  question,
  schedule = [],
}) {
  const prompt = question.trim();
  const normalizedPrompt = normalize(prompt);

  if (!prompt) {
    return makeReply(
      "Ask me about schedule, location, judging, food, parking, or event rules.",
    );
  }

  const faqAnswer = findFaqAnswer(normalizedPrompt, faqs);
  if (faqAnswer) {
    return makeReply(faqAnswer.answer, {
      source: faqAnswer.category ? `FAQ: ${faqAnswer.category}` : "FAQ",
      tone: "confident",
    });
  }

  if (hasAny(normalizedPrompt, ["schedule", "agenda", "session", "workshop", "talk", "demo"])) {
    return answerSchedule(schedule);
  }

  if (hasAny(normalizedPrompt, ["judge", "judging", "submit", "submission", "demo"])) {
    return answerMatchingSchedule(schedule, ["judge", "judging", "submit", "submission", "demo"]);
  }

  if (hasAny(normalizedPrompt, ["food", "lunch", "dinner", "breakfast", "snack", "meal", "coffee"])) {
    return answerMatchingSchedule(schedule, ["food", "lunch", "dinner", "breakfast", "snack", "meal", "coffee"]);
  }

  if (hasAny(normalizedPrompt, ["map", "where", "location", "venue", "address", "parking", "park"])) {
    return answerLocation(event);
  }

  if (hasAny(normalizedPrompt, ["start", "begin", "open", "time", "hour", "end", "finish"])) {
    return answerHours(event);
  }

  if (hasAny(normalizedPrompt, ["announcement", "update", "news", "notice"])) {
    return answerAnnouncements(announcements);
  }

  if (hasAny(normalizedPrompt, ["capacity", "register", "registration", "waitlist", "status"])) {
    return answerRegistration(event);
  }

  return makeReply(
    "I could not find that in the published event data yet. Send it to organizer support so a human can answer it.",
    {
      escalate: true,
      source: "Support",
      tone: "uncertain",
    },
  );
}

export function getSuggestedBotQuestions(event) {
  if (!event) {
    return ["What events are live?", "How do teams work?", "Where is support?"];
  }

  return [
    "When does it start?",
    "Where is the venue?",
    "What is on the schedule?",
    "Is there food?",
  ];
}

function answerSchedule(schedule) {
  if (schedule.length === 0) {
    return makeReply(
      "The schedule has not been published yet. Check back when organizers add talks, food, workshops, and judging times.",
      { source: "Schedule", tone: "uncertain" },
    );
  }

  const nextItems = schedule.slice(0, 4).map(formatScheduleItem).join("\n");

  return makeReply(`Here are the next published sessions:\n${nextItems}`, {
    source: "Schedule",
    tone: "confident",
  });
}

function answerMatchingSchedule(schedule, keywords) {
  const matches = schedule
    .filter((item) =>
      keywords.some((keyword) =>
        normalize(
          `${item.title} ${item.description ?? ""} ${item.category ?? ""} ${item.location ?? ""}`,
        ).includes(keyword),
      ),
    )
    .slice(0, 4);

  if (matches.length === 0) {
    return makeReply(
      "I do not see a published schedule item for that yet. If it is urgent, ask organizer support.",
      { escalate: true, source: "Schedule", tone: "uncertain" },
    );
  }

  return makeReply(matches.map(formatScheduleItem).join("\n"), {
    source: "Schedule",
    tone: "confident",
  });
}

function answerLocation(event) {
  if (!event) {
    return makeReply("Choose an event first and I can pull up the venue details.", {
      tone: "uncertain",
    });
  }

  const parts = [
    event.location_name ? `Venue: ${event.location_name}` : null,
    event.address ? `Address: ${event.address}` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return makeReply(
      "The venue details are not published yet. Organizer support can confirm the location.",
      { escalate: true, source: "Event", tone: "uncertain" },
    );
  }

  return makeReply(parts.join("\n"), {
    source: "Event",
    tone: "confident",
  });
}

function answerHours(event) {
  if (!event?.starts_at && !event?.ends_at) {
    return makeReply(
      "The event hours are not published yet. Ask organizer support for the current timing.",
      { escalate: true, source: "Event", tone: "uncertain" },
    );
  }

  const starts = event.starts_at ? `Starts: ${formatDateTime(event.starts_at)}` : null;
  const ends = event.ends_at ? `Ends: ${formatDateTime(event.ends_at)}` : null;

  return makeReply([starts, ends].filter(Boolean).join("\n"), {
    source: "Event",
    tone: "confident",
  });
}

function answerAnnouncements(announcements) {
  if (announcements.length === 0) {
    return makeReply("No announcements have been published for this event yet.", {
      source: "Announcements",
      tone: "uncertain",
    });
  }

  const recent = announcements
    .slice(0, 3)
    .map((announcement) => `${announcement.title}: ${announcement.body}`)
    .join("\n");

  return makeReply(recent, {
    source: "Announcements",
    tone: "confident",
  });
}

function answerRegistration(event) {
  if (!event) {
    return makeReply("Choose an event first and I can check its status.", {
      tone: "uncertain",
    });
  }

  const status = event.registration_status
    ? formatStatus(event.registration_status)
    : "Status TBA";
  const capacity = event.capacity ? `Capacity: ${event.capacity}` : null;

  return makeReply([`Registration: ${status}`, capacity].filter(Boolean).join("\n"), {
    source: "Event",
    tone: "confident",
  });
}

function findFaqAnswer(prompt, faqs) {
  const promptTokens = tokenize(prompt);
  let bestMatch = null;

  for (const faq of faqs) {
    const text = normalize(`${faq.question} ${faq.answer} ${faq.category ?? ""}`);
    const faqTokens = tokenize(text);
    const overlap = promptTokens.filter((token) => faqTokens.includes(token)).length;
    const exactQuestionHit = text.includes(prompt) || prompt.includes(normalize(faq.question));
    const score = overlap + (exactQuestionHit ? 4 : 0);

    if (score > (bestMatch?.score ?? 0)) {
      bestMatch = { ...faq, score };
    }
  }

  return bestMatch?.score > 1 ? bestMatch : null;
}

function makeReply(text, options = {}) {
  return {
    escalate: Boolean(options.escalate),
    source: options.source ?? "Hackmate Bot",
    text,
    tone: options.tone ?? "neutral",
  };
}

function formatScheduleItem(item) {
  const time = formatTimeRange(item.starts_at, item.ends_at);
  const location = item.location ? ` at ${item.location}` : "";
  return `${time} - ${item.title}${location}`;
}

function formatTimeRange(startsAt, endsAt) {
  if (!startsAt) return "Time TBA";

  const starts = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startsAt));

  if (!endsAt) return starts;

  const ends = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endsAt));

  return `${starts}-${ends}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatStatus(value) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(value) {
  return normalize(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}
