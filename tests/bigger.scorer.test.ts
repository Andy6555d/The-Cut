import { describe, expect, it } from "vitest";
import { computeBiggerScore, isBiggerResultPlausible } from "@/lib/microgames/bigger/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "bigger",
  version: 1,
  difficulty: { biggerSide: 1 },
  seed: 1,
};

describe("bigger scorer", () => {
  it("scores a correct tap as its reaction time", () => {
    const events = [{ type: "tap", clientTimestamp: 420, data: { side: 1 } }];
    expect(computeBiggerScore(config, events)).toBe(420);
  });

  it("treats a correct, reasonably fast tap as plausible", () => {
    const events = [{ type: "tap", clientTimestamp: 420, data: { side: 1 } }];
    expect(isBiggerResultPlausible(config, events)).toBe(true);
  });

  it("treats a wrong-side tap as implausible regardless of speed", () => {
    const events = [{ type: "tap", clientTimestamp: 300, data: { side: 0 } }];
    expect(isBiggerResultPlausible(config, events)).toBe(false);
  });

  it("returns Infinity when there is no tap at all", () => {
    expect(computeBiggerScore(config, [])).toBe(Number.POSITIVE_INFINITY);
  });
});
