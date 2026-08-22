import { describe, expect, it } from "vitest";
import { computeDontTapScore, isDontTapResultPlausible } from "@/lib/microgames/dont-tap/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const goConfig: MicrogameConfig = {
  microgameId: "dont-tap",
  version: 1,
  difficulty: { isGo: 1, timeoutMs: 1200 },
  seed: 1,
};

const noGoConfig: MicrogameConfig = {
  microgameId: "dont-tap",
  version: 1,
  difficulty: { isGo: 0, timeoutMs: 1200 },
  seed: 1,
};

describe("dont-tap scorer", () => {
  it("scores a go-trial tap as its reaction time", () => {
    const events = [{ type: "tap", clientTimestamp: 350 }];
    expect(computeDontTapScore(goConfig, events)).toBe(350);
  });

  it("scores a missed go-trial (no tap) as a failure", () => {
    const events = [{ type: "timeout", clientTimestamp: 1200 }];
    expect(computeDontTapScore(goConfig, events)).toBe(Number.POSITIVE_INFINITY);
  });

  it("scores a successfully withheld no-go trial as a perfect zero", () => {
    const events = [{ type: "timeout", clientTimestamp: 1200 }];
    expect(computeDontTapScore(noGoConfig, events)).toBe(0);
  });

  it("scores a false-alarm tap on a no-go trial as a failure", () => {
    const events = [{ type: "tap", clientTimestamp: 400 }];
    expect(computeDontTapScore(noGoConfig, events)).toBe(Number.POSITIVE_INFINITY);
    expect(isDontTapResultPlausible(noGoConfig, events)).toBe(false);
  });
});
