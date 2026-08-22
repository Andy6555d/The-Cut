# THE CUT — Auto-Seed Cron + Name Popup + Bug Fix

## The "Andy" bug

The error you saw ("Letters, numbers, spaces...") was wrong — "Andy" is a
perfectly valid name. The actual bug: `DisplayNamePrompt` showed that
exact message for **any** failed save, not just an actual validation
failure. The real cause was almost certainly that migration `0004`
(which adds `players.display_name`) hadn't been run yet in Supabase, so
the database update failed with a real error that got masked by the
wrong message.

Fixed two ways:
- The server route now returns the actual database error detail alongside
  the generic `update_failed` code.
- The client now only shows the character-rule message when the server
  specifically says the input was invalid — anything else shows the real
  detail, so a future failure (of any kind) is diagnosable instead of
  misleading.

**Make sure migration `0004_display_names_and_leagues.sql` has actually
been run in Supabase** — if it hasn't, this is why names won't save.

## Home screen name popup

`HomeNamePopup` shows once, automatically, the first time someone lands
on the home screen without a name set yet — asks for a name, has a SKIP
option, and never nags again afterward (tracked in `localStorage`, not
tied to whether they actually set a name — skipping counts as "asked and
answered," same as saving one). They can still set or change it any time
from the leaderboard or leagues page via the existing inline
`DisplayNamePrompt`.

## Automated Daily seeding (the cron)

- `lib/domain/daily-generation/seedDailyForDate.ts` — the seeding logic
  extracted out of the admin route into a shared, reusable function.
  Idempotent: seeding an already-existing date just reports
  `already_exists` rather than erroring, so it's always safe to re-run.
- `/api/admin/seed-daily` — simplified to call the shared function;
  behaves identically to before.
- `/api/cron/seed-upcoming` — new. Seeds **today plus the next 2 UTC
  dates** every time it runs. That 3-day buffer exists specifically
  because local-midnight resets mean a player's "today" can already be a
  day ahead (Auckland) or behind (Los Angeles) of UTC at any given
  moment — a single daily run stays comfortably ahead of every timezone's
  own midnight without needing per-timezone scheduling logic.
- `vercel.json` — schedules that route once a day. **You need to edit
  this file before or after deploying**: replace
  `REPLACE_WITH_YOUR_ATTEMPT_TOKEN_SECRET` with your actual
  `ATTEMPT_TOKEN_SECRET` value, or the cron will hit the route and get
  rejected as unauthorized every time.

### Setup

1. Edit `vercel.json` in this delivery — swap in your real secret.
2. Deploy as usual.
3. Vercel → your project → the "Cron Jobs" tab (should appear once
   `vercel.json` with a `crons` entry is deployed) — confirm the job is
   listed and shows recent runs after it's had a chance to fire.
4. You can also trigger it manually any time by visiting
   `https://the-cutday.vercel.app/api/cron/seed-upcoming?secret=YOUR_SECRET`
   directly in a browser — useful for confirming it works right now
   rather than waiting for the schedule.

This closes the manual-reseeding gap from before — you shouldn't need to
remember to seed dates by hand going forward, though it's still worth
spot-checking the Cron Jobs tab occasionally until you've seen it run
successfully a few times.
