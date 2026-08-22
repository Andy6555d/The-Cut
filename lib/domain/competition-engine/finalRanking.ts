export interface FinalRankingInput {
  attemptId: string;
  roundsSurvived: number;
  finalRoundRawScore: number | null; // null if eliminated with no scored final round somehow
  finalRoundMetricDirection: "lower_is_better" | "higher_is_better" | null;
}

export interface FinalRankingResult {
  attemptId: string;
  finalPercentile: number; // 0-100, "you beat/tied this % of players"
  worldRank: number; // 1-based; ties share the same rank (shared #1 allowed)
}

// Ranks the complete population for a closed Daily. Order: more rounds
// survived beats fewer; within the same rounds-survived tier, the better
// final-round score (by that round's own metric direction) ranks higher.
// A genuine tie shares the same rank, per the "shared #1" decision — no
// artificial tiebreaker is invented. See ARCHITECTURE.md §6D.
export function computeFinalRanking(attempts: FinalRankingInput[]): FinalRankingResult[] {
  if (attempts.length === 0) return [];

  const sorted = [...attempts].sort((a, b) => {
    if (a.roundsSurvived !== b.roundsSurvived) return b.roundsSurvived - a.roundsSurvived;

    if (a.finalRoundRawScore === null && b.finalRoundRawScore === null) return 0;
    if (a.finalRoundRawScore === null) return 1;
    if (b.finalRoundRawScore === null) return -1;

    const direction = a.finalRoundMetricDirection ?? b.finalRoundMetricDirection ?? "lower_is_better";
    return direction === "lower_is_better"
      ? a.finalRoundRawScore - b.finalRoundRawScore
      : b.finalRoundRawScore - a.finalRoundRawScore;
  });

  const total = sorted.length;
  const results: FinalRankingResult[] = [];
  let rank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    // Always in range — i is bounded by the loop condition itself. Guard
    // exists only to satisfy noUncheckedIndexedAccess, mirroring the same
    // pattern already used in the CENTRE scorer's polygon loop.
    if (current === undefined) continue;
    const previous = i > 0 ? sorted[i - 1] : undefined;

    const isTiedWithPrevious =
      previous !== undefined &&
      previous.roundsSurvived === current.roundsSurvived &&
      previous.finalRoundRawScore === current.finalRoundRawScore;

    if (!isTiedWithPrevious) rank = i + 1;

    // Percentile = percentage of the field this attempt beat or tied —
    // rank-based so genuine ties land on the same number, never split.
    const beatenOrTied = ((total - rank + 1) / total) * 100;

    results.push({ attemptId: current.attemptId, finalPercentile: beatenOrTied, worldRank: rank });
  }

  return results;
}
