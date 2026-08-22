export type MetricDirection = "lower_is_better" | "higher_is_better";

export interface CalibrationCandidate {
  targetSurvivalPct: number;
  cutoffValue: number;
}

// Picks the calibration entry whose target survival percentage is closest
// to the round's desired target. This runs ONCE, before a Daily is
// published — never during the live window. See ARCHITECTURE.md §6A.
export function pickCutoffValue(
  candidates: CalibrationCandidate[],
  targetSurvivalPct: number
): number {
  if (candidates.length === 0) {
    throw new Error(
      "No calibration candidates available for this microgame/difficulty — " +
        "seed a bootstrap_default calibration before generating a Daily round."
    );
  }

  let closest = candidates[0]!;
  let closestDistance = Math.abs(closest.targetSurvivalPct - targetSurvivalPct);

  for (const candidate of candidates) {
    const distance = Math.abs(candidate.targetSurvivalPct - targetSurvivalPct);
    if (distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }

  return closest.cutoffValue;
}

// The only place "did this score survive" is decided. A score exactly at
// the cutoff survives (inclusive), matching the "STOP" game's own framing
// of the cutoff as the line you must be within, not strictly outside.
export function didSurvive(
  rawScore: number,
  cutoffValue: number,
  metricDirection: MetricDirection
): boolean {
  if (!Number.isFinite(rawScore)) return false; // a failed/implausible attempt never survives
  return metricDirection === "lower_is_better" ? rawScore <= cutoffValue : rawScore >= cutoffValue;
}
