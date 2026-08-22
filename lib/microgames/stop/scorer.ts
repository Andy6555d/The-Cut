import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// Round shape: a counter runs from 0 upward at `speed` units/second, starting
// at round start. Player taps STOP; score = |counterValueAtTap - target|.
// Client sends a single 'tap' event with clientTimestamp = ms since round
// start. The server recomputes the counter value from that timestamp and
// the round's own config — it never trusts a client-reported counter value.

export function computeStopScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const target = config.difficulty.target ?? 5.0; // seconds
  const speed = config.difficulty.speed ?? 1.0; // units per second (1.0 = counts real seconds)

  const tap = events.find((e) => e.type === "tap");
  if (!tap) return Number.POSITIVE_INFINITY;

  const elapsedSeconds = tap.clientTimestamp / 1000;
  const counterValue = elapsedSeconds * speed;
  return Math.abs(counterValue - target);
}

export function isStopResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const tap = events.find((e) => e.type === "tap");
  if (!tap) return false;
  // A tap has to land somewhere within a sane window around when the counter
  // was actually visible — not negative, not absurdly long after.
  return tap.clientTimestamp >= 0 && tap.clientTimestamp <= 30000;
}

export const stopScorer: ServerScorer = {
  microgameId: "stop",
  version: 1,
  computeScore: computeStopScore,
  isPlausible: isStopResultPlausible,
};
