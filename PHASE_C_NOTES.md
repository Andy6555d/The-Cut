# THE CUT — Phase C: The Daily Engine

## What's new

- **Anonymous identity** (`lib/domain/identity/anonymousPlayer.ts`) — a
  first visit to any `/api/attempt/*` route gets an opaque, httpOnly cookie
  and a `players` row. No PII, ever.
- **Signed attempt tokens** (`lib/domain/attemptToken.ts`) — HMAC-signed via
  Node's built-in `crypto` (no new dependency to risk), scoped to one
  player + one Daily + a 2-hour expiry.
- **The attempt lifecycle**: `/api/attempt/start`, `/api/attempt/round`,
  `/api/attempt/finish`. Start enforces one official attempt per Daily
  (backed by the DB's own unique constraint, not just app logic). Round
  recomputes the score server-side from raw input events — the client's
  own number is never trusted. Finish is idempotent and auto-triggered by
  round on elimination or the last round, per the lifecycle design in
  ARCHITECTURE.md.
- **The fixed-cutoff engine** (`lib/domain/competition-engine/cutoffs.ts`) —
  pure functions: pick a cutoff from calibration data, decide survival.
  Cutoffs are written once at Daily-seed time and never recomputed during
  the live window — this is the non-negotiable rule from our cutoff-freeze
  discussion, enforced by the code shape itself (there is no "recompute
  cutoff" code path at all, not even one that's currently unused).
- **Estimated live percentile** (`lib/domain/competition-engine/percentile.ts`) —
  derived from each round's own pre-published target band, so it needs no
  live-sample infrastructure to produce. Deliberately a rough estimate,
  labeled as such wherever it's shown, per our "CURRENTLY TOP X%" vs "FINAL
  RESULT" distinction.
- **Final ranking engine** (`lib/domain/competition-engine/finalRanking.ts`) —
  ranks the complete population once a Daily closes; genuine ties share a
  rank (shared #1 allowed, per your decision), never an invented tiebreak.
- **The countdown** (`lib/microgames/engine/Countdown.tsx`) — counts down to
  the player's next local midnight reset (updated in V5).
- **`/daily`** — the actual playable Daily, reusing the same REACT/STOP/CENTRE
  components from practice. Each round now shows its target band and exact
  cutoff *before* you play it (e.g. "THE 75% CUT"), per your own proposal
  that players should know exactly what's required going in.

## A significant, honest gap: bootstrap calibration

There are no completed Dailies yet, and practice attempts are still local-
only (not recorded server-side). That means there is **no real data** to
calibrate cutoffs from. Rather than block the whole engine on that, I
seeded a small set of **hand-picked placeholder cutoff values**, clearly
labeled `source: 'bootstrap_default'` in the database — a new, honestly-
named category (migration `0002`) distinct from real historical or
practice-pool data, specifically so nobody ever mistakes a guess for
calibrated data later. These placeholder values are almost certainly not
well-tuned (I don't have real human performance data to tune them against)
— expect the actual survival rates on your first test run to land nowhere
near the intended 75%/50%/25%/10%/5% bands. That's expected and fine for
proving the engine works; real calibration is a data problem to solve once
Dailies and/or server-tracked practice attempts start accumulating.

## Also not yet built

- **Automatic Daily generation/publish/close on a schedule.** Right now,
  creating and closing a Daily are both manual, secret-protected URLs (see
  below) — there's no Vercel Cron wiring yet. That's a natural Phase G
  (admin control) or a small standalone addition once you want the Daily to
  run itself.
- **Real admin authentication.** The `secret` query-string check on the two
  admin routes is not real access control — anyone with the secret can hit
  them. Fine for you alone testing; must be replaced before this app has
  other admin users.
- **Live atomic player counts.** `live_round_counts` updates via a
  read-then-write, not an atomic increment — fine at your current traffic,
  worth revisiting with a proper Postgres function before real concurrent
  load.

## Setup steps

1. **Run the new migration.** Supabase → SQL Editor → paste and run
   `supabase/migrations/0002_phase_c_bootstrap_calibration_source.sql`.
2. **Upload this delivery to GitHub** the same way as before (drag the
   whole folder into the upload box) and let Vercel build.
3. **Seed today's Daily.** Visit, in your browser:
   `https://the-cutday.vercel.app/api/admin/seed-daily?secret=YOUR_ATTEMPT_TOKEN_SECRET`
   — replace with the actual value you set for `ATTEMPT_TOKEN_SECRET` in
   Vercel. You should see `{"status":"created_and_published", ...}`. Use the optional `&date=YYYY-MM-DD` parameter to seed the calendar-date Daily needed by players. Running the same date again just
   returns `{"status":"already_exists", ...}`.
4. **Play it.** Visit `/daily` on your phone. You should see "PLAY", then
   go round by round with each round's target band and cutoff shown
   up front, then either "CUT." with an estimated percentile, or
   "YOU SURVIVED." if you clear every round.
5. **Try to play twice.** You should be blocked with "ALREADY PLAYED" —
   this is the one-attempt-per-Daily rule actually being enforced by the
   database, not just the UI.
6. **Optional — close the Daily to test final ranking.** Visit
   `https://the-cutday.vercel.app/api/admin/close-daily?secret=YOUR_ATTEMPT_TOKEN_SECRET`.
   Check Supabase → Table Editor → `daily_results` afterward — completed
   attempts should now have `final_percentile`, `world_rank`, and
   `is_final = true` set.

Once you've confirmed the whole loop — seed, play, get cut or survive,
already-played block, close — works end to end, tell me and I'll start
**Phase D**: the remaining 7 microgames.


## V5 local-midnight update

See `LOCAL_MIDNIGHT_RESET_V5_NOTES.md`. The Daily is now selected from the player's browser/device timezone and official eligibility resets at that player's local midnight, not UTC midnight. Run migration `0003_local_midnight_daily_reset.sql` before deploying V5.
