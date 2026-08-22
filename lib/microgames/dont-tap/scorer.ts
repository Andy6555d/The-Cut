import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// A full round is now a SEQUENCE of go/no-go trials (default 8, at least
// one full mix of both), not a single stimulus — each trial's answer
// (isGo) is generated client-side and injected into the effective config
// as trial{i}IsGo, same accepted pattern as MEMORY GRID's pattern{i}
// flattening (real server-seeded trial sequences are the same known gap
// noted for the other composite games before any of this goes into an
// official Daily). Every submitted event carries data.trial identifying
// which trial it answers; the server never trusts a claimed correctness,
// only recomputes it from each trial's actual isGo value and what the
// player actually did.

function trialIsGo(config: MicrogameConfig, trial: number): boolean {
  return (config.difficulty[`trial${trial}IsGo`] ?? 1) === 1;
}

export function computeDontTapErrors(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const trialCount = config.difficulty.trialCount ?? 8;
  let errors = 0;

  for (let trial = 0; trial < trialCount; trial++) {
    const event = events.find((e) => e.data?.trial === trial);
    if (!event) {
      errors++; // a trial with no recorded response at all
      continue;
    }
    const isGo = trialIsGo(config, trial);
    if (isGo && event.type !== "tap") errors++; // missed a go trial
    if (!isGo && event.type === "tap") errors++; // false alarm on a no-go trial
  }

  return errors;
}

// Accuracy dominates; total reaction time across correctly-tapped go
// trials breaks ties between equally accurate runs. One wrong trial costs
// 10 seconds of "time," so a fast but inaccurate run can never beat a
// slower, fully correct one. Lower is better — matches the same
// convention already used for MEMORY GRID.
export function computeDontTapScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const errors = computeDontTapErrors(config, events);
  const totalReactionMs = events
    .filter((e) => e.type === "tap")
    .reduce((sum, e) => sum + Math.max(0, e.clientTimestamp), 0);
  return errors * 10_000 + totalReactionMs;
}

export function isDontTapResultPlausible(config: MicrogameConfig, events: MicrogameInputEvent[]): boolean {
  const trialCount = config.difficulty.trialCount ?? 8;
  const responseWindowMs = config.difficulty.responseWindowMs ?? 500;

  const trialsSeen = new Set(events.map((e) => e.data?.trial));
  if (trialsSeen.size < trialCount) return false;

  // Every event's timestamp has to fall within a sane window around its
  // own trial's response deadline — small negative allowance for timing
  // jitter right at trial onset, generous upper bound for the timeout
  // event itself plus network/render slack.
  return events.every((e) => {
    if (e.clientTimestamp < -50 || e.clientTimestamp > responseWindowMs + 150) return false;
    if (e.type === "tap" && e.clientTimestamp < 70) return false;
    return true;
  });
}

export const dontTapScorer: ServerScorer = {
  microgameId: "dont-tap",
  version: 1,
  computeScore: computeDontTapScore,
  isPlausible: isDontTapResultPlausible,
};
