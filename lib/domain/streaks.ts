// Streaks are tracked against the Daily's own date, not server wall-clock
// time — so finishing right at the date boundary always attributes to the
// Daily you actually played, never an edge-case "wrong day."

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
  freezesAvailable: number;
}

export interface StreakUpdateResult extends StreakState {
  freezeConsumed: boolean; // true if this update was only kept alive by a freeze
  freezeEarned: boolean; // true if this update just earned a new freeze
}

const MAX_FREEZES = 2; // matches the typical free-tier cap other daily-streak
// products use — enough to feel forgiving, not so many a broken streak
// stops meaning anything.
const FREEZE_EARN_INTERVAL = 7; // one earned every 7-day milestone

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Given the player's existing streak state and the date of the Daily they
// just completed, returns the updated state. Per spec §24: shown
// prominently but never sold or manipulated — freezes here are strictly
// EARNED (one per 7-day milestone, capped) and auto-consumed with no user
// decision required, never purchased, never manually activated.
export function computeStreakUpdate(state: StreakState, dailyDate: string): StreakUpdateResult {
  if (state.lastPlayedDate === dailyDate) {
    // Already recorded for this Daily (shouldn't happen given one attempt
    // per Daily, but idempotent by design rather than by luck).
    return { ...state, freezeConsumed: false, freezeEarned: false };
  }

  const previousDay = addDaysToDateString(dailyDate, -1);
  const twoDaysBefore = addDaysToDateString(dailyDate, -2);

  const isConsecutive = state.lastPlayedDate === previousDay;
  const isExactlyOneDayMissed = state.lastPlayedDate === twoDaysBefore;
  const canAutoFreeze = !isConsecutive && isExactlyOneDayMissed && state.freezesAvailable > 0;

  const keepsStreakAlive = isConsecutive || canAutoFreeze;
  const currentStreak = keepsStreakAlive ? state.currentStreak + 1 : 1;
  const longestStreak = Math.max(state.longestStreak, currentStreak);

  const freezeConsumed = canAutoFreeze;
  let freezesAvailable = freezeConsumed ? state.freezesAvailable - 1 : state.freezesAvailable;

  const freezeEarned = keepsStreakAlive && currentStreak > 0 && currentStreak % FREEZE_EARN_INTERVAL === 0 && freezesAvailable < MAX_FREEZES;
  if (freezeEarned) freezesAvailable += 1;

  return {
    currentStreak,
    longestStreak,
    lastPlayedDate: dailyDate,
    freezesAvailable,
    freezeConsumed,
    freezeEarned,
  };
}
