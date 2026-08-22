// Streaks are tracked against the Daily's own date, not server wall-clock
// time — so finishing right at the date boundary always attributes to the
// Daily you actually played, never an edge-case "wrong day."

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
}

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Given the player's existing streak state and the date of the Daily they
// just completed, returns the updated state. Per spec §24: shown
// prominently but never sold or manipulated — this function has no
// concept of purchases or restoration, only genuine consecutive play.
export function computeStreakUpdate(state: StreakState, dailyDate: string): StreakState {
  if (state.lastPlayedDate === dailyDate) {
    // Already recorded for this Daily (shouldn't happen given one attempt
    // per Daily, but idempotent by design rather than by luck).
    return state;
  }

  const previousDay = addDaysToDateString(dailyDate, -1);
  const isConsecutive = state.lastPlayedDate === previousDay;

  const currentStreak = isConsecutive ? state.currentStreak + 1 : 1;
  const longestStreak = Math.max(state.longestStreak, currentStreak);

  return { currentStreak, longestStreak, lastPlayedDate: dailyDate };
}
