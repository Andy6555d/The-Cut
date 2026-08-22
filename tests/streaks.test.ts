import { describe, expect, it } from "vitest";
import { computeStreakUpdate, type StreakState } from "@/lib/domain/streaks";

describe("computeStreakUpdate", () => {
  it("starts a new streak at 1 for a first-ever play", () => {
    const state: StreakState = { currentStreak: 0, longestStreak: 0, lastPlayedDate: null };
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result).toEqual({ currentStreak: 1, longestStreak: 1, lastPlayedDate: "2026-08-21" });
  });

  it("increments the streak when the previous play was exactly the day before", () => {
    const state: StreakState = { currentStreak: 4, longestStreak: 4, lastPlayedDate: "2026-08-20" };
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
  });

  it("resets the streak to 1 when a day was missed", () => {
    const state: StreakState = { currentStreak: 10, longestStreak: 10, lastPlayedDate: "2026-08-18" };
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10); // longest is preserved, never lowered
  });

  it("is a no-op if somehow called twice for the same Daily date", () => {
    const state: StreakState = { currentStreak: 3, longestStreak: 5, lastPlayedDate: "2026-08-21" };
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result).toEqual(state);
  });

  it("correctly handles a month boundary when checking the previous day", () => {
    const state: StreakState = { currentStreak: 2, longestStreak: 2, lastPlayedDate: "2026-07-31" };
    const result = computeStreakUpdate(state, "2026-08-01");
    expect(result.currentStreak).toBe(3);
  });
});
