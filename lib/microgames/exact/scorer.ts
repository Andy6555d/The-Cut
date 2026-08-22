import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// Round shape: player holds a button, server measures the gap between the
// hold-start and hold-end event timestamps and compares it to the target
// hold duration. Score = |actual duration - target| in seconds.

export function computeExactScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const target = config.difficulty.targetSeconds ?? 3.0;
  const start = events.find((e) => e.type === "hold_start");
  const end = events.find((e) => e.type === "hold_end");
  if (!start || !end) return Number.POSITIVE_INFINITY;

  const durationSeconds = (end.clientTimestamp - start.clientTimestamp) / 1000;
  return Math.abs(durationSeconds - target);
}

export function isExactResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const start = events.find((e) => e.type === "hold_start");
  const end = events.find((e) => e.type === "hold_end");
  if (!start || !end) return false;
  const durationMs = end.clientTimestamp - start.clientTimestamp;
  // A hold shorter than 100ms isn't a genuine attempt at a multi-second
  // hold; anything past 15s is treated as an abandoned/stuck press.
  return durationMs >= 100 && durationMs <= 15000;
}

export const exactScorer: ServerScorer = {
  microgameId: "exact",
  version: 1,
  computeScore: computeExactScore,
  isPlausible: isExactResultPlausible,
};
