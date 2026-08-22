export interface RoundTarget {
  roundNumber: number;
  targetSurvivalPct: number; // e.g. 0.75 means "this round was calibrated to let ~75% through"
}

// A live estimate shown immediately after elimination — explicitly an
// estimate, never presented as the final result (ARCHITECTURE.md §6C).
// It is derived entirely from the pre-published target survival bands
// already baked into the Daily's rounds, so it needs no live sample-
// distribution infrastructure to produce — a deliberately cheap estimate
// for Phase C, refinable later without changing its meaning to the player.
//
// If eliminated at round N: your estimate is that round's own target band
// (you didn't clear the cut that was calibrated to admit that fraction).
// If you survived every round played so far, your estimate is the target
// band of the last round you cleared.
export function estimatePercentile(
  roundsSurvived: number,
  roundTargets: RoundTarget[],
  eliminated: boolean
): number | null {
  if (roundTargets.length === 0) return null;
  const sorted = [...roundTargets].sort((a, b) => a.roundNumber - b.roundNumber);

  if (eliminated) {
    const eliminatedAtRound = roundsSurvived + 1;
    const target = sorted.find((r) => r.roundNumber === eliminatedAtRound);
    return target ? target.targetSurvivalPct : (sorted[sorted.length - 1]?.targetSurvivalPct ?? null);
  }

  const lastSurvived = sorted.find((r) => r.roundNumber === roundsSurvived);
  return lastSurvived ? lastSurvived.targetSurvivalPct : (sorted[0]?.targetSurvivalPct ?? null);
}
