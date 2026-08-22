# THE CUT — Phase E: Results, Streaks, Leaderboard

## What's new

- **Streaks** (`lib/domain/streaks.ts`) — a pure, tested function tracking
  consecutive days played. Keyed off the **Daily's own date**, not server
  wall-clock time, so finishing right at the UTC boundary always
  attributes to the Daily you actually played. Wired into `finalizeAttempt`
  so it updates automatically the moment an attempt completes — no
  separate call needed anywhere. Shown on the elimination/success screens
  as "🔥 N day streak," matching §24's guidance: prominent, never sold,
  never restorable by purchase (there's no code path that could even do
  that).
- **"Players today" context** — the elimination/success screens now show
  roughly how many players attempted today and an estimate of how many you
  beat, derived from the same `live_round_counts` data already being
  tracked, no new infrastructure needed.
- **Real sharing on Daily results** — same share pattern as practice
  (native share sheet, clipboard fallback), now with text reflecting your
  actual Daily result ("I survived 3 rounds... currently TOP 12%").
- **A basic worldwide leaderboard** (`/leaderboard`, `/api/leaderboard`) —
  top 20 by rank for the most recently **closed** Daily (or a specific
  `?date=`). Anonymous players get a short non-identifying handle derived
  from their own player id (`Player #A1B2C3`) rather than any real name.
- **Small bonus fix while in this file**: `DailyRunner` only ever knew
  about 3 games (REACT/STOP/CENTRE) since Phase C — it now includes all 10
  from Phase D. This doesn't fix the client-self-reported-answer gap noted
  in the Phase D notes (that's still real, still unfixed), but it does
  mean the Daily *can* actually render all 10 if `BOOTSTRAP_ROUNDS` is
  ever expanded to use them.

## A real bug I found and fixed while building this

The leaderboard's first draft would have silently mixed rankings from
*every* closed Daily together, not just the one being viewed — I'd
queried `daily_results` by `is_final = true` alone, but that table has no
`daily_id` of its own; it's only reachable via `attempt_id`. Fixed by
fetching the target Daily's attempts first, then restricting the ranked
results to exactly those. Caught this in review before it ever reached
you, not after a failed build — worth mentioning since most of what
you've seen me catch has been the compiler telling us; this one wasn't.

## Setup

No new environment variables. No new migration — everything here uses
tables already created in Phase A (`streaks`, `live_round_counts`,
`daily_results`). Same upload flow as always.

## What to check once it's live

- Play today's Daily (reopen it in Supabase if you already closed it, same
  as before) and confirm the elimination/success screen shows a streak
  count, a "players today" line, and a working SHARE button.
- Play on two consecutive (real) days if you want to see the streak
  actually increment — day 1 shows "🔥 1 day streak," day 2 should show
  "🔥 2 day streak." (Or fake it by editing `streaks.last_played_date` in
  Supabase to yesterday's date before playing today, if you don't want to
  wait.)
- After closing a Daily (via `close-daily` as before), visit `/leaderboard`
  — you should see your entry with a rank, rounds survived, and estimated
  top-percentage.

## Still not here

- Achievements (§23) — explicitly deferred to Phase 2/J in the original
  spec, not part of Phase E's scope.
- Country/friends leaderboard views — only worldwide-for-one-Daily exists.
- The Daily-integration gap from Phase D notes is still open.

Let me know how it plays, and whether you want Phase F (real referral
tracking) next, or to close that Daily-integration gap.
