import type { MicrogameConfig, MicrogameInputEvent, ServerScorer } from "@/lib/microgames/engine/types";

// The shape is an irregular polygon so the visual "middle" a player eyeballs
// differs from the true geometric centroid — that gap is the whole game.
// The polygon's own points are part of the round config (six vertices,
// stored as flattened p0x..p5y in [0,1] normalized space) so the server
// recomputes the true centroid independently rather than trusting a
// client-reported "correct answer." The client sends only where the player
// tapped, as normalized {x, y} in the same [0,1] space.



export interface Point {
  x: number;
  y: number;
}

export function polygonFromConfig(config: MicrogameConfig): Point[] {
  const points: Point[] = [];
  const pointCount = Math.max(3, Math.round(config.difficulty.pointCount ?? 6));
  for (let i = 0; i < pointCount; i++) {
    // Falls back to the canvas centre (0.5, 0.5) only if a point is somehow
    // missing from config — which should never happen for a real attempt,
    // since the client always writes all six points before submitting.
    // This is a defensive default, not an expected code path.
    const x = config.difficulty[`p${i}x`] ?? 0.5;
    const y = config.difficulty[`p${i}y`] ?? 0.5;
    points.push({ x, y });
  }
  return points;
}

// Area-weighted polygon centroid (shoelace-based), not the average of the
// vertices — the average-of-vertices point is systematically biased toward
// wherever vertices happen to cluster, which is exactly the kind of "easy
// tell" that would make the game trivial.
export function polygonCentroid(points: Point[]): Point {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    // Both indices are always in range by construction (i < points.length,
    // and (i+1) % points.length wraps back into range) — this guard exists
    // only to satisfy noUncheckedIndexedAccess, not because it can trigger.
    if (p0 === undefined || p1 === undefined) continue;
    const cross = p0.x * p1.y - p1.x * p0.y;
    area += cross;
    cx += (p0.x + p1.x) * cross;
    cy += (p0.y + p1.y) * cross;
  }

  area = area / 2;
  if (Math.abs(area) < 1e-9) {
    // Degenerate polygon fallback — average the vertices rather than divide by ~0.
    const n = points.length;
    return {
      x: points.reduce((s, p) => s + p.x, 0) / n,
      y: points.reduce((s, p) => s + p.y, 0) / n,
    };
  }

  return { x: cx / (6 * area), y: cy / (6 * area) };
}

export function computeCentreScore(config: MicrogameConfig, events: MicrogameInputEvent[]): number {
  const tap = events.find((e) => e.type === "tap");
  if (!tap || tap.data?.x === undefined || tap.data?.y === undefined) {
    return Number.POSITIVE_INFINITY;
  }

  const centroid = polygonCentroid(polygonFromConfig(config));
  const dx = Number(tap.data.x) - centroid.x;
  const dy = Number(tap.data.y) - centroid.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isCentreResultPlausible(
  config: MicrogameConfig,
  events: MicrogameInputEvent[]
): boolean {
  const tap = events.find((e) => e.type === "tap");
  if (!tap || tap.data?.x === undefined || tap.data?.y === undefined) return false;
  const x = Number(tap.data.x);
  const y = Number(tap.data.y);
  // Tap has to land within (or very slightly outside, for touch imprecision)
  // the normalized canvas — a coordinate wildly out of range means tampering
  // or a client bug, not a genuine attempt.
  const limit = config.difficulty.timeLimitMs ?? 3000;
  return x >= -0.05 && x <= 1.05 && y >= -0.05 && y <= 1.05 && tap.clientTimestamp >= 100 && tap.clientTimestamp <= limit + 250;
}

export const centreScorer: ServerScorer = {
  microgameId: "centre",
  version: 1,
  computeScore: computeCentreScore,
  isPlausible: isCentreResultPlausible,
};
