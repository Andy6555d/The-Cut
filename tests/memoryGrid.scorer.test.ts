import { describe, expect, it } from "vitest";
import { computeMemoryGridErrors, computeMemoryGridScore, isMemoryGridResultPlausible, getPatternIndices } from "@/lib/microgames/memory-grid/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = {
  microgameId: "memory-grid",
  version: 1,
  difficulty: { gridSize: 3, patternLength: 3, pattern0: 0, pattern1: 4, pattern2: 8 },
  seed: 1,
};

describe("memory-grid scorer", () => {
  it("decodes the flattened pattern config into the correct indices", () => {
    expect(getPatternIndices(config)).toEqual(new Set([0, 4, 8]));
  });

  it("uses completion time when recall is perfect", () => {
    const events = [0, 4, 8].map((idx, i) => ({ type: "tap", clientTimestamp: (i + 1) * 300, data: { cellIndex: idx } }));
    expect(computeMemoryGridErrors(config, events)).toBe(0);
    expect(computeMemoryGridScore(config, events)).toBe(900);
  });

  it("makes accuracy dominate speed", () => {
    const events = [0, 4, 5].map((idx, i) => ({ type: "tap", clientTimestamp: (i + 1) * 100, data: { cellIndex: idx } }));
    expect(computeMemoryGridErrors(config, events)).toBe(2);
    expect(computeMemoryGridScore(config, events)).toBe(20300);
  });

  it("rejects a tap index outside the grid as implausible", () => {
    const events = [{ type: "tap", clientTimestamp: 300, data: { cellIndex: 99 } }];
    expect(isMemoryGridResultPlausible(config, events)).toBe(false);
  });
});
