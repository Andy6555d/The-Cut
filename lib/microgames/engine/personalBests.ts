"use client";

// Local cache for instant PB feedback. V7 mirrors practice attempts server-side
// and hydrates this cache from the server, so registered players can carry
// training history across devices without putting network latency in the game loop.

interface PracticeRecord {
  scores: number[]; // stored in the game's own units, chronological
}

const STORAGE_PREFIX = "the_cut_practice_";

function todayKey(): string {
  // Practice "today" follows the player's local calendar day too, so
  // today's practice stats reset alongside the Daily at local midnight.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readRecord(microgameId: string): PracticeRecord {
  if (typeof window === "undefined") return { scores: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + microgameId);
    return raw ? (JSON.parse(raw) as PracticeRecord) : { scores: [] };
  } catch {
    return { scores: [] };
  }
}

function writeRecord(microgameId: string, record: PracticeRecord) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + microgameId, JSON.stringify(record));
  } catch {
    // Storage full or unavailable (private browsing). Non-fatal — practice
    // still works, it just won't remember this run.
  }
}

export function recordPracticeScore(microgameId: string, score: number) {
  const record = readRecord(microgameId);
  record.scores.push(score);
  // Keep it bounded — this is a lightweight local cache, not a ledger.
  if (record.scores.length > 200) record.scores = record.scores.slice(-200);
  writeRecord(microgameId, record);

  const dayKey = STORAGE_PREFIX + microgameId + "_day_" + todayKey();
  try {
    const existing = window.localStorage.getItem(dayKey);
    const todayScores: number[] = existing ? JSON.parse(existing) : [];
    todayScores.push(score);
    window.localStorage.setItem(dayKey, JSON.stringify(todayScores));
  } catch {
    // non-fatal
  }
}

export function getPracticeStats(
  microgameId: string,
  metricDirection: "lower_is_better" | "higher_is_better"
) {
  const record = readRecord(microgameId);
  const scores = record.scores;

  const best =
    scores.length === 0
      ? null
      : metricDirection === "lower_is_better"
      ? Math.min(...scores)
      : Math.max(...scores);

  const average =
    scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;

  let todayScores: number[] = [];
  try {
    const raw = window.localStorage.getItem(
      STORAGE_PREFIX + microgameId + "_day_" + todayKey()
    );
    todayScores = raw ? JSON.parse(raw) : [];
  } catch {
    todayScores = [];
  }
  const todayAverage =
    todayScores.length === 0
      ? null
      : todayScores.reduce((a, b) => a + b, 0) / todayScores.length;

  return { best, average, todayAverage, attemptCount: scores.length };
}


export function hydratePracticeScores(microgameId: string, incoming: number[]) {
  if (typeof window === "undefined" || !Array.isArray(incoming)) return;
  const clean = incoming.filter((n) => typeof n === "number" && Number.isFinite(n)).slice(-200);
  const current = readRecord(microgameId).scores;
  if (clean.length > current.length) writeRecord(microgameId, { scores: clean });
}
