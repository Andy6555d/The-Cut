import { describe, expect, it } from "vitest";
import { computeExactScore, isExactResultPlausible } from "@/lib/microgames/exact/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "exact",
  version: 1,
  difficulty: { targetSeconds: 3.0 },
  seed: 1,
};

describe("exact scorer", () => {
  it("scores a perfect hold as zero error", () => {
    const events = [
      { type: "hold_start", clientTimestamp: 0 },
      { type: "hold_end", clientTimestamp: 3000 },
    ];
    expect(computeExactScore(config, events)).toBeCloseTo(0, 5);
  });

  it("scores error as the absolute difference from target", () => {
    const events = [
      { type: "hold_start", clientTimestamp: 100 },
      { type: "hold_end", clientTimestamp: 3350 },
    ];
    expect(computeExactScore(config, events)).toBeCloseTo(0.25, 3);
  });

  it("returns Infinity when hold_start or hold_end is missing", () => {
    expect(computeExactScore(config, [{ type: "hold_start", clientTimestamp: 0 }])).toBe(
      Number.POSITIVE_INFINITY
    );
  });

  it("rejects a near-instant tap as implausible", () => {
    const events = [
      { type: "hold_start", clientTimestamp: 0 },
      { type: "hold_end", clientTimestamp: 20 },
    ];
    expect(isExactResultPlausible(config, events)).toBe(false);
  });
});
