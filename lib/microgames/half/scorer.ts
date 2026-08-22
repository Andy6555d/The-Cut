import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// The line segment's own start/end (normalized [0,1] along the container
// width) are part of the round config — generated client-side per round and
// injected into the effective config before scoring, same pattern as
// CENTRE's polygon points. This keeps the true midpoint server-computable
// without trusting the client's own claimed "correct" answer.

export function computeHalfScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const lineStart = config.difficulty.lineStartX ?? 0;
  const lineEnd = config.difficulty.lineEndX ?? 1;
  const midpoint = (lineStart + lineEnd) / 2;
  const length = Math.abs(lineEnd - lineStart) || 1;

  const tap = events.find((e) => e.type === "tap");
  if (!tap || tap.data?.x === undefined) return Number.POSITIVE_INFINITY;

  return Math.abs(Number(tap.data.x) - midpoint) / length;
}

export function isHalfResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const tap = events.find((e) => e.type === "tap");
  if (!tap || tap.data?.x === undefined) return false;
  const x = Number(tap.data.x);
  const limit = config.difficulty.timeLimitMs ?? 2000;
  return x >= -0.05 && x <= 1.05 && tap.clientTimestamp >= 100 && tap.clientTimestamp <= limit + 250;
}

export const halfScorer: ServerScorer = {
  microgameId: "half",
  version: 1,
  computeScore: computeHalfScore,
  isPlausible: isHalfResultPlausible,
};
