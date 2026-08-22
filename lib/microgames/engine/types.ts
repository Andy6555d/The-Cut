// Shared contract every microgame implements. See ARCHITECTURE.md §8.
//
// Client (Microgame) renders and captures input. Server (ServerScorer)
// recomputes the authoritative score from the same raw events — the client
// never gets the final word on a score, it only proposes one.

export interface MicrogameConfig {
  microgameId: string; // slug, e.g. "stop"
  version: number;
  difficulty: Record<string, number>;
  seed: number; // deterministic per-Daily; practice mode can pass Date.now()
}

export interface MicrogameInputEvent {
  type: string; // 'tap' | 'hold_start' | 'hold_end' | ...
  clientTimestamp: number; // ms, performance.now()-based, relative to round start
  data?: Record<string, number | string>;
}

export type MetricDirection = "lower_is_better" | "higher_is_better";

export interface ResultFeedback {
  title?: string;
  primaryLabel?: string;
  primaryValue?: string;
  targetLabel?: string;
  targetValue?: string;
  errorLabel?: string;
  errorValue?: string;
  direction?: "early" | "late" | "left" | "right" | "fast" | "slow" | "exact" | "correct" | "wrong" | "none";
  accuracyPct?: number;
  rating?: "perfect" | "excellent" | "great" | "good" | "close" | "poor";
  message?: string;
  performanceScore?: number; // 0-1000 display score for practice feedback only
  timeMs?: number;
  thresholdPct?: number;
  thresholdPassed?: boolean;
  secondaryStats?: Array<{ label: string; value: string; tone?: "good" | "warn" | "bad" | "neutral" }>;
}

export interface MicrogameResult {
  rawScore: number;
  metricDirection: MetricDirection;
  inputEvents: MicrogameInputEvent[];
  clientComputedScore: number; // advisory only; server recomputes independently
  failed?: boolean; // e.g. false start, timeout — a result that can never survive
  failureReason?: string;
  feedback?: ResultFeedback;
}

export interface Microgame {
  id: string;
  version: number;
  category:
    | "reaction"
    | "timing"
    | "precision"
    | "visual"
    | "memory"
    | "estimation"
    | "inhibition"
    | "logic"
    | "coordination";
}

export interface ServerScorer {
  microgameId: string;
  version: number;
  computeScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number;
  isPlausible(config: MicrogameConfig, events: MicrogameInputEvent[]): boolean;
}
