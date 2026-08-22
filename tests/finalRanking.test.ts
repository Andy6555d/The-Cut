import { describe, expect, it } from "vitest";
import { computeFinalRanking } from "@/lib/domain/competition-engine/finalRanking";

describe("computeFinalRanking", () => {
  it("ranks more rounds survived above fewer, regardless of score", () => {
    const results = computeFinalRanking([
      { attemptId: "a", roundsSurvived: 2, finalRoundRawScore: 999, finalRoundMetricDirection: "lower_is_better" },
      { attemptId: "b", roundsSurvived: 3, finalRoundRawScore: 0.5, finalRoundMetricDirection: "lower_is_better" },
    ]);
    const b = results.find((r) => r.attemptId === "b")!;
    const a = results.find((r) => r.attemptId === "a")!;
    expect(b.worldRank).toBe(1);
    expect(a.worldRank).toBe(2);
  });

  it("within the same rounds-survived tier, ranks the better lower_is_better score first", () => {
    const results = computeFinalRanking([
      { attemptId: "a", roundsSurvived: 3, finalRoundRawScore: 0.2, finalRoundMetricDirection: "lower_is_better" },
      { attemptId: "b", roundsSurvived: 3, finalRoundRawScore: 0.1, finalRoundMetricDirection: "lower_is_better" },
    ]);
    expect(results.find((r) => r.attemptId === "b")!.worldRank).toBe(1);
    expect(results.find((r) => r.attemptId === "a")!.worldRank).toBe(2);
  });

  it("gives a genuine tie a shared rank, not an artificial tiebreak", () => {
    const results = computeFinalRanking([
      { attemptId: "a", roundsSurvived: 3, finalRoundRawScore: 0.15, finalRoundMetricDirection: "lower_is_better" },
      { attemptId: "b", roundsSurvived: 3, finalRoundRawScore: 0.15, finalRoundMetricDirection: "lower_is_better" },
      { attemptId: "c", roundsSurvived: 2, finalRoundRawScore: 0.5, finalRoundMetricDirection: "lower_is_better" },
    ]);
    const a = results.find((r) => r.attemptId === "a")!;
    const b = results.find((r) => r.attemptId === "b")!;
    const c = results.find((r) => r.attemptId === "c")!;
    expect(a.worldRank).toBe(1);
    expect(b.worldRank).toBe(1);
    expect(c.worldRank).toBe(3); // skips rank 2 — standard competition ranking
  });

  it("returns an empty array for an empty population", () => {
    expect(computeFinalRanking([])).toEqual([]);
  });
});
