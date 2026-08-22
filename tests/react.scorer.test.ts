import { describe, expect, it } from "vitest";
import { computeReactScore, isReactResultPlausible } from "@/lib/microgames/react/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "react",
  version: 1,
  difficulty: { stimulusDelayMs: 2000 },
  seed: 1,
};

describe("react scorer", () => {
  it("computes reaction time relative to the stimulus", () => {
    const score = computeReactScore(config, [{ type: "tap", clientTimestamp: 2230 }]);
    expect(score).toBe(230);
  });

  it("returns Infinity when there is no tap event", () => {
    expect(computeReactScore(config, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects impossibly fast reactions as implausible", () => {
    const events = [{ type: "tap", clientTimestamp: 2005 }]; // 5ms reaction
    expect(isReactResultPlausible(config, events)).toBe(false);
  });

  it("accepts a normal human reaction time as plausible", () => {
    const events = [{ type: "tap", clientTimestamp: 2230 }]; // 230ms reaction
    expect(isReactResultPlausible(config, events)).toBe(true);
  });

  it("rejects a tap left hanging far past the stimulus as implausible", () => {
    const events = [{ type: "tap", clientTimestamp: 6000 }]; // 4000ms reaction
    expect(isReactResultPlausible(config, events)).toBe(false);
  });
});
