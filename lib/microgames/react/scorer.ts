import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// Round shape (client and server agree on this, driven by config.difficulty):
//   - stimulusDelayMs: how long after round start the "NOW!" cue appears
//   - Client sends a single 'tap' event with clientTimestamp = ms since round start
//   - Score = clientTimestamp - stimulusDelayMs (reaction time in ms)
//   - A tap before stimulusDelayMs is a false start: handled as a failure,
//     never a real (fast) score, at the call-site — see isPlausible below
//     and app/practice/react's client component for the failure path.

export function computeReactScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const stimulusDelayMs = config.difficulty.stimulusDelayMs ?? 2000;
  const tap = events.find((e) => e.type === "tap");
  if (!tap) return Number.POSITIVE_INFINITY; // no input at all — worst possible score
  return tap.clientTimestamp - stimulusDelayMs;
}

export function isReactResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const stimulusDelayMs = config.difficulty.stimulusDelayMs ?? 2000;
  const tap = events.find((e) => e.type === "tap");
  if (!tap) return false;
  const reaction = tap.clientTimestamp - stimulusDelayMs;
  // Human visual reaction time has a hard physiological floor around 100ms.
  // Anything faster than 80ms after the stimulus is not a real reaction —
  // it's either a false start that slipped past client detection, or
  // tampering. Anything beyond 3s past the stimulus is treated as a miss,
  // not scored as a very slow reaction.
  return reaction >= 80 && reaction <= 3000;
}

export const reactScorer: ServerScorer = {
  microgameId: "react",
  version: 1,
  computeScore: computeReactScore,
  isPlausible: isReactResultPlausible,
};
