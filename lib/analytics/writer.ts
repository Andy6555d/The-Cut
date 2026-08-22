import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export interface AnalyticsEventInput {
  eventName: string;
  playerId?: string | null;
  sessionId: string;
  dailyId?: string | null;
  microgameId?: string | null;
  properties?: Record<string, unknown>;
  occurredAt?: string; // ISO string; defaults to server "now" if omitted
}

// Writes a batch of events in a single insert. Called by the
// /api/analytics/event route handler, never directly from timing-sensitive
// gameplay code — the client always queues and flushes in batches so a slow
// analytics call can never affect round timing.
export async function writeAnalyticsEvents(events: AnalyticsEventInput[]) {
  if (events.length === 0) return;

  const supabase = getSupabaseServerClient();

  const rows = events.map((e) => ({
    event_name: e.eventName,
    player_id: e.playerId ?? null,
    session_id: e.sessionId,
    daily_id: e.dailyId ?? null,
    microgame_id: e.microgameId ?? null,
    properties: e.properties ?? {},
    occurred_at: e.occurredAt ?? new Date().toISOString(),
  }));

  const { error } = await supabase.from("analytics_events").insert(rows);
  if (error) {
    // Analytics failures must never break the player-facing request that
    // triggered them. Log and swallow.
    console.error("analytics_events insert failed:", error.message);
  }
}
