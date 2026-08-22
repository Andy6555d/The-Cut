import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

export function getPatternIndices(config: MicrogameConfig): Set<number> {
  const patternLength = config.difficulty.patternLength ?? 4;
  const indices = new Set<number>();
  for (let i = 0; i < patternLength; i++) {
    const value = config.difficulty[`pattern${i}`];
    if (value !== undefined) indices.add(value);
  }
  return indices;
}

export function computeMemoryGridErrors(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const pattern = getPatternIndices(config);
  const taps = events.filter((e) => e.type === "tap");
  const tapped = new Set(taps.map((t) => Number(t.data?.cellIndex)));

  let errors = 0;
  for (const idx of tapped) if (!pattern.has(idx)) errors++;
  for (const idx of pattern) if (!tapped.has(idx)) errors++;
  return errors;
}

// Accuracy dominates; speed breaks ties between equally accurate attempts.
// One memory error costs 10 seconds, so a fast wrong answer can never beat a
// correct but thoughtful answer. Lower is better.
export function computeMemoryGridScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const taps = events.filter((e) => e.type === "tap");
  if (taps.length === 0) return Number.POSITIVE_INFINITY;
  const errors = computeMemoryGridErrors(config, events);
  const completionMs = Math.max(...taps.map((e) => e.clientTimestamp));
  return errors * 10_000 + completionMs;
}

export function isMemoryGridResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const gridSize = config.difficulty.gridSize ?? 3;
  const cellCount = gridSize * gridSize;
  const taps = events.filter((e) => e.type === "tap");
  if (taps.length === 0) return false;

  const deadline = config.difficulty.answerDeadlineMs ?? 5000;
  const unique = new Set(taps.map((t) => Number(t.data?.cellIndex)));
  const completion = Math.max(...taps.map((t) => t.clientTimestamp));
  return unique.size === taps.length && completion >= 120 && completion <= deadline + 250 && taps.every((t) => {
    const idx = t.data?.cellIndex;
    return typeof idx === "number" && idx >= 0 && idx < cellCount && t.clientTimestamp >= 0;
  });
}

export const memoryGridScorer: ServerScorer = {
  microgameId: "memory-grid",
  version: 1,
  computeScore: computeMemoryGridScore,
  isPlausible: isMemoryGridResultPlausible,
};
