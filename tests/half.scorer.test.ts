import { describe, expect, it } from "vitest";
import { computeHalfScore, isHalfResultPlausible } from "@/lib/microgames/half/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "half",
  version: 1,
  difficulty: { lineStartX: 0.2, lineEndX: 0.8 },
  seed: 1,
};

describe("half scorer", () => {
  it("scores a tap at the true midpoint as zero error", () => {
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 0.5 } }];
    expect(computeHalfScore(config, events)).toBeCloseTo(0, 5);
  });

  it("scores error as a fraction of the line's own length", () => {
    // Line spans 0.2-0.8 (length 0.6). Tapping at 0.65 is 0.15 off the
    // midpoint (0.5), which is 0.25 of the line's length.
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 0.65 } }];
    expect(computeHalfScore(config, events)).toBeCloseTo(0.25, 3);
  });

  it("returns Infinity when the tap has no x coordinate", () => {
    expect(computeHalfScore(config, [{ type: "tap", clientTimestamp: 100 }])).toBe(
      Number.POSITIVE_INFINITY
    );
  });

  it("rejects a tap wildly outside the container", () => {
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 5 } }];
    expect(isHalfResultPlausible(config, events)).toBe(false);
  });
});
