import { describe, expect, it } from "vitest";
import { computeStopScore, isStopResultPlausible } from "@/lib/microgames/stop/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "stop",
  version: 1,
  difficulty: { target: 5.0, speed: 1.0 },
  seed: 1,
};

describe("stop scorer", () => {
  it("scores a perfect tap as zero error", () => {
    const events = [{ type: "tap", clientTimestamp: 5000 }]; // exactly 5.000s
    expect(computeStopScore(config, events)).toBeCloseTo(0, 5);
  });

  it("scores error as the absolute difference from target", () => {
    const events = [{ type: "tap", clientTimestamp: 5142 }]; // 5.142s
    expect(computeStopScore(config, events)).toBeCloseTo(0.142, 3);
  });

  it("respects a non-1.0 speed multiplier", () => {
    const fastConfig: MicrogameConfig = { ...config, difficulty: { target: 5.0, speed: 2.0 } };
    // counter value = elapsedSeconds * speed = 2.5s * 2.0 = 5.0 → perfect
    const events = [{ type: "tap", clientTimestamp: 2500 }];
    expect(computeStopScore(fastConfig, events)).toBeCloseTo(0, 5);
  });

  it("returns Infinity when there is no tap", () => {
    expect(computeStopScore(config, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects a negative timestamp as implausible", () => {
    const events = [{ type: "tap", clientTimestamp: -10 }];
    expect(isStopResultPlausible(config, events)).toBe(false);
  });
});
