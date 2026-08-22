"use client";

interface QueuedEvent {
  eventName: string;
  properties: Record<string, unknown>;
  occurredAt: string;
}

const FLUSH_INTERVAL_MS = 5000;
const FLUSH_BATCH_SIZE = 20;
const ENDPOINT = "/api/analytics/event";

let queue: QueuedEvent[] = [];
let sessionId: string | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function getSessionId(): string {
  if (sessionId) return sessionId;
  const existing = sessionStorage.getItem("the_cut_session_id");
  if (existing) {
    sessionId = existing;
    return existing;
  }
  const fresh = crypto.randomUUID();
  sessionStorage.setItem("the_cut_session_id", fresh);
  sessionId = fresh;
  return fresh;
}

function flush(useBeacon = false) {
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];

  const payload = JSON.stringify({
    sessionId: getSessionId(),
    events: batch,
  });

  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(ENDPOINT, payload);
    return;
  }

  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Best-effort. A dropped analytics event is never worth retry logic
    // that could interfere with the player's experience.
  });
}

// Call this once, near the root of the app (e.g. in a client layout effect).
export function initAnalytics() {
  if (typeof window === "undefined" || flushTimer) return;

  flushTimer = setInterval(() => flush(), FLUSH_INTERVAL_MS);
  window.addEventListener("pagehide", () => flush(true));
  window.addEventListener("beforeunload", () => flush(true));
}

// Call this anywhere in client code to record a product event.
// Never awaited by gameplay code — it only queues, it does not block.
export function track(eventName: string, properties: Record<string, unknown> = {}) {
  queue.push({
    eventName,
    properties,
    occurredAt: new Date().toISOString(),
  });
  if (queue.length >= FLUSH_BATCH_SIZE) flush();
}
