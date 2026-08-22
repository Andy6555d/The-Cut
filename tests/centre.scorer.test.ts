import { describe, expect, it } from "vitest";
import { computeCentreScore, isCentreResultPlausible, polygonCentroid } from "@/lib/microgames/centre/scorer";
import type { MicrogameConfig } from "@/lib/microgames/engine/types";

// A simple square (0,0)-(1,0)-(1,1)-(0,1) padded to 6 points by repeating
// the last vertex — centroid of a square is trivially its own middle,
// which makes this a clean sanity check for the shoelace-based centroid.
const squareConfig: MicrogameConfig = {
  microgameId: "centre",
  version: 1,
  difficulty: {
    p0x: 0, p0y: 0,
    p1x: 1, p1y: 0,
    p2x: 1, p2y: 1,
    p3x: 0, p3y: 1,
    p4x: 0, p4y: 1,
    p5x: 0, p5y: 1,
  },
  seed: 1,
};

describe("centre scorer", () => {
  it("computes the true centroid of a square as its middle", () => {
    const centroid = polygonCentroid([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
    expect(centroid.x).toBeCloseTo(0.5, 5);
    expect(centroid.y).toBeCloseTo(0.5, 5);
  });

  it("scores a tap at the true centre as (near) zero distance", () => {
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 0.5, y: 0.5 } }];
    expect(computeCentreScore(squareConfig, events)).toBeLessThan(0.01);
  });

  it("scores a tap away from centre as the correct Euclidean distance", () => {
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 0.5, y: 0.0 } }];
    // Square centroid is (0.5, 0.5); distance straight up to (0.5, 0.0) is 0.5
    expect(computeCentreScore(squareConfig, events)).toBeCloseTo(0.5, 5);
  });

  it("returns Infinity when the tap has no coordinates", () => {
    const events = [{ type: "tap", clientTimestamp: 100 }];
    expect(computeCentreScore(squareConfig, events)).toBe(Number.POSITIVE_INFINITY);
  });

  it("rejects a tap coordinate wildly outside the canvas", () => {
    const events = [{ type: "tap", clientTimestamp: 100, data: { x: 5, y: -3 } }];
    expect(isCentreResultPlausible(squareConfig, events)).toBe(false);
  });
});
