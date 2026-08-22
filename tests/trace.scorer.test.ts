import { describe, expect, it } from "vitest";
import { computeTraceDeviation, computeTraceScore, isTraceResultPlausible, traceAccuracyPct, traceDurationMs } from "@/lib/microgames/trace/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

const config: MicrogameConfig = { microgameId: "trace", version: 1, difficulty: { targetRadius: 0.3, accuracyThresholdPct: 90 }, seed: 1 };

function pointsOnCircle(radius: number, count: number, interval = 100) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return { type: "point", clientTimestamp: i * interval, data: { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius } };
  });
}

describe("trace scorer", () => {
  it("measures accuracy and duration separately", () => {
    const events = pointsOnCircle(0.3, 10);
    expect(computeTraceDeviation(config, events)).toBeCloseTo(0, 5);
    expect(traceAccuracyPct(config, events)).toBeCloseTo(100, 5);
    expect(traceDurationMs(events)).toBe(900);
    expect(computeTraceScore(config, events)).toBe(900);
  });

  it("penalises a trace below the accuracy threshold", () => {
    const events = pointsOnCircle(0.45, 10);
    expect(traceAccuracyPct(config, events)).toBeCloseTo(85, 5);
    expect(computeTraceScore(config, events)).toBeGreaterThan(100000);
  });

  it("rejects too-short traces", () => {
    expect(isTraceResultPlausible(config, pointsOnCircle(0.3, 2))).toBe(false);
  });
});
