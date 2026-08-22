import { describe, expect, it } from "vitest";
import { pickCutoffValue, didSurvive } from "@/lib/domain/competition-engine/cutoffs";

describe("pickCutoffValue", () => {
  it("picks the exact match when available", () => {
    const candidates = [
      { targetSurvivalPct: 0.75, cutoffValue: 0.2 },
      { targetSurvivalPct: 0.5, cutoffValue: 0.1 },
    ];
    expect(pickCutoffValue(candidates, 0.5)).toBe(0.1);
  });

  it("picks the closest target when there is no exact match", () => {
    const candidates = [
      { targetSurvivalPct: 0.75, cutoffValue: 0.2 },
      { targetSurvivalPct: 0.1, cutoffValue: 0.05 },
    ];
    expect(pickCutoffValue(candidates, 0.15)).toBe(0.05);
  });

  it("throws when there are no candidates at all", () => {
    expect(() => pickCutoffValue([], 0.5)).toThrow();
  });
});

describe("didSurvive", () => {
  it("survives a score exactly at the cutoff (inclusive) for lower_is_better", () => {
    expect(didSurvive(0.15, 0.15, "lower_is_better")).toBe(true);
  });

  it("fails a score worse than the cutoff for lower_is_better", () => {
    expect(didSurvive(0.16, 0.15, "lower_is_better")).toBe(false);
  });

  it("survives a score at or above the cutoff for higher_is_better", () => {
    expect(didSurvive(10, 10, "higher_is_better")).toBe(true);
    expect(didSurvive(11, 10, "higher_is_better")).toBe(true);
    expect(didSurvive(9, 10, "higher_is_better")).toBe(false);
  });

  it("never survives a non-finite (failed/implausible) score", () => {
    expect(didSurvive(Number.POSITIVE_INFINITY, 0.15, "lower_is_better")).toBe(false);
    expect(didSurvive(NaN, 0.15, "lower_is_better")).toBe(false);
  });
});
