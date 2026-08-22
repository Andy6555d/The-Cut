import { describe, expect, it } from "vitest";
import { computeCountError, computeCountScore, isCountResultPlausible } from "@/lib/microgames/count/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = { microgameId: "count", version: 1, difficulty: { actualCount: 7 }, seed: 1 };

describe("count scorer", () => {
  it("uses answer time for an exact count", () => {
    const events = [{ type: "answer", clientTimestamp: 850, data: { guess: 7 } }];
    expect(computeCountError(config, events)).toBe(0);
    expect(computeCountScore(config, events)).toBe(850);
  });

  it("makes accuracy dominate speed", () => {
    const events = [{ type: "answer", clientTimestamp: 300, data: { guess: 10 } }];
    expect(computeCountError(config, events)).toBe(3);
    expect(computeCountScore(config, events)).toBe(30300);
  });

  it("returns Infinity when there is no answer", () => {
    expect(computeCountScore(config, [])).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects an out-of-range guess as implausible", () => {
    expect(isCountResultPlausible(config, [{ type: "answer", clientTimestamp: 100, data: { guess: 1000 } }])).toBe(false);
  });
});
