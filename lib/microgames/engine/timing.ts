// Every microgame times against performance.now(), never Date.now() — it's
// monotonic and sub-millisecond, which matters when a 5ms difference decides
// whether a player survives.

// How long the in-game result (the big colored number) stays on screen
// before control hands back to the practice summary. Long enough to
// actually read it, short enough that practice still feels fast.
export const RESULT_REVEAL_MS = 1100;

export function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
