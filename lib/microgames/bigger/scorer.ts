import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// Which side is actually bigger is part of the round config (biggerSide: 0
// or 1), injected client-side before scoring, same pattern as CENTRE/HALF.
// Score is reaction time; a wrong-side tap is never scored as a fast
// success — it's plain implausible, same treatment as REACT's false start.

export function computeBiggerScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const tap = events.find((e) => e.type === "tap");
  if (!tap) return Number.POSITIVE_INFINITY;
  return tap.clientTimestamp;
}

export function isBiggerResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const biggerSide = config.difficulty.biggerSide ?? 0;
  const tap = events.find((e) => e.type === "tap");
  if (!tap || tap.data?.side === undefined) return false;

  const correct = Number(tap.data.side) === biggerSide;
  const reaction = tap.clientTimestamp;
  return correct && reaction >= 80 && reaction <= 5000;
}

export const biggerScorer: ServerScorer = {
  microgameId: "bigger",
  version: 1,
  computeScore: computeBiggerScore,
  isPlausible: isBiggerResultPlausible,
};
