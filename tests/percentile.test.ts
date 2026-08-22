import { describe, expect, it } from "vitest";
import { estimatePercentile } from "@/lib/domain/competition-engine/percentile";

const targets = [
  { roundNumber: 1, targetSurvivalPct: 0.75 },
  { roundNumber: 2, targetSurvivalPct: 0.5 },
  { roundNumber: 3, targetSurvivalPct: 0.25 },
];

describe("estimatePercentile", () => {
  it("estimates from the round you were eliminated at", () => {
    // Survived 0 rounds, eliminated at round 1 → that round's own target band.
    expect(estimatePercentile(0, targets, true)).toBe(0.75);
  });

  it("estimates from the round survived when eliminated mid-way", () => {
    // Survived round 1, eliminated at round 2.
    expect(estimatePercentile(1, targets, true)).toBe(0.5);
  });

  it("estimates from the last round survived when the whole Daily is cleared", () => {
    expect(estimatePercentile(3, targets, false)).toBe(0.25);
  });

  it("returns null when there are no round targets at all", () => {
    expect(estimatePercentile(1, [], true)).toBeNull();
  });
});
