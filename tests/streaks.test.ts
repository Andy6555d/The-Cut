import { describe, expect, it } from "vitest";
import { computeStreakUpdate, type StreakState } from "@/lib/domain/streaks";

const base = (overrides: Partial<StreakState>): StreakState => ({
  currentStreak: 0,
  longestStreak: 0,
  lastPlayedDate: null,
  freezesAvailable: 0,
  ...overrides,
});

describe("computeStreakUpdate", () => {
  it("starts a new streak at 1 for a first-ever play", () => {
    const result = computeStreakUpdate(base({}), "2026-08-21");
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.lastPlayedDate).toBe("2026-08-21");
    expect(result.freezeConsumed).toBe(false);
  });

  it("increments the streak when the previous play was exactly the day before", () => {
    const state = base({ currentStreak: 4, longestStreak: 4, lastPlayedDate: "2026-08-20" });
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result.currentStreak).toBe(5);
    expect(result.longestStreak).toBe(5);
    expect(result.freezeConsumed).toBe(false);
  });

  it("resets the streak to 1 when more than one day was missed, even with a freeze available", () => {
    const state = base({ currentStreak: 10, longestStreak: 10, lastPlayedDate: "2026-08-18", freezesAvailable: 1 });
    const result = computeStreakUpdate(state, "2026-08-21"); // 3 days later, not 2
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
    expect(result.freezeConsumed).toBe(false); // a freeze only covers exactly one missed day
    expect(result.freezesAvailable).toBe(1); // untouched — never spent on a gap it can't cover
  });

  it("auto-consumes a freeze to keep the streak alive across exactly one missed day", () => {
    const state = base({ currentStreak: 6, longestStreak: 6, lastPlayedDate: "2026-08-19", freezesAvailable: 1 });
    const result = computeStreakUpdate(state, "2026-08-21"); // missed the 20th
    expect(result.currentStreak).toBe(7); // kept alive, counts as if consecutive
    expect(result.freezeConsumed).toBe(true);
    expect(result.freezesAvailable).toBe(1); // spent the one it had, but earned a new one at the 7-day mark
    expect(result.freezeEarned).toBe(true);
  });

  it("resets to 1 across one missed day when no freeze is available", () => {
    const state = base({ currentStreak: 6, longestStreak: 6, lastPlayedDate: "2026-08-19", freezesAvailable: 0 });
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result.currentStreak).toBe(1);
    expect(result.freezeConsumed).toBe(false);
  });

  it("earns a freeze at a 7-day milestone, capped at the maximum", () => {
    const state = base({ currentStreak: 6, longestStreak: 6, lastPlayedDate: "2026-08-20", freezesAvailable: 2 });
    const result = computeStreakUpdate(state, "2026-08-21"); // becomes day 7
    expect(result.currentStreak).toBe(7);
    expect(result.freezeEarned).toBe(false); // already at the cap of 2
    expect(result.freezesAvailable).toBe(2);
  });

  it("is a no-op if somehow called twice for the same Daily date", () => {
    const state = base({ currentStreak: 3, longestStreak: 5, lastPlayedDate: "2026-08-21", freezesAvailable: 1 });
    const result = computeStreakUpdate(state, "2026-08-21");
    expect(result.currentStreak).toBe(3);
    expect(result.freezesAvailable).toBe(1);
    expect(result.freezeConsumed).toBe(false);
  });

  it("correctly handles a month boundary when checking the previous day", () => {
    const state = base({ currentStreak: 2, longestStreak: 2, lastPlayedDate: "2026-07-31" });
    const result = computeStreakUpdate(state, "2026-08-01");
    expect(result.currentStreak).toBe(3);
  });
});
