import { reactScorer } from "@/lib/microgames/react/scorer";
import { stopScorer } from "@/lib/microgames/stop/scorer";
import { centreScorer } from "@/lib/microgames/centre/scorer";
import { exactScorer } from "@/lib/microgames/exact/scorer";
import { halfScorer } from "@/lib/microgames/half/scorer";
import { biggerScorer } from "@/lib/microgames/bigger/scorer";
import { memoryGridScorer } from "@/lib/microgames/memory-grid/scorer";
import { countScorer } from "@/lib/microgames/count/scorer";
import { dontTapScorer } from "@/lib/microgames/dont-tap/scorer";
import { traceScorer } from "@/lib/microgames/trace/scorer";
import type { MetricDirection, ServerScorer } from "@/lib/microgames/engine/types";

// Every playable microgame registers here. All 10 from the original spec
// are now present.
export const SCORER_REGISTRY: Record<string, ServerScorer> = {
  react: reactScorer,
  stop: stopScorer,
  centre: centreScorer,
  exact: exactScorer,
  half: halfScorer,
  bigger: biggerScorer,
  "memory-grid": memoryGridScorer,
  count: countScorer,
  "dont-tap": dontTapScorer,
  trace: traceScorer,
};

// All 10 current games score "lower is better" — kept as an explicit
// registry (not assumed) so a future game with the opposite direction has
// an obvious place to declare it rather than silently inheriting a wrong
// default.
export const METRIC_DIRECTION_REGISTRY: Record<string, MetricDirection> = {
  react: "lower_is_better",
  stop: "lower_is_better",
  centre: "lower_is_better",
  exact: "lower_is_better",
  half: "lower_is_better",
  bigger: "lower_is_better",
  "memory-grid": "lower_is_better",
  count: "lower_is_better",
  "dont-tap": "lower_is_better",
  trace: "lower_is_better",
};

export function getScorer(microgameId: string): ServerScorer | null {
  return SCORER_REGISTRY[microgameId] ?? null;
}

export function getMetricDirection(microgameId: string): MetricDirection {
  return METRIC_DIRECTION_REGISTRY[microgameId] ?? "lower_is_better";
}
