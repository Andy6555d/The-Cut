# THE CUT — Streak Freezes, Share Grid, Leagues Weekly Cycle

Second delivery addressing the critical review. First covered Memory
Grid's mid-tap feedback (turned out to already be fixed). This one:

## Streak freezes — earned, never bought

New migration `0006`. `streaks.ts` rewritten: earn one freeze automatically
every 7-day milestone (capped at 2), auto-consumed with zero user action
when exactly one day is missed, hard reset preserved for anything longer.
Matches the research finding directly: freeze protection has to deploy
without requiring the user to open the app, since the user who missed a
day is by definition not opening the app at the moment it would matter.
Full test coverage in `tests/streaks.test.ts`.

Also fixed: the streak was only ever shown once, immediately after
finishing a Daily — nowhere else. New `/api/player/streak` route plus a
persistent badge on the home screen. This was the whole point of the
critique: a streak only becomes identity when it's always visible, not
glimpsed once a day.

The Daily result screen now also shows "❄️ a freeze covered yesterday" or
"❄️ new freeze earned" when relevant.

## Share grid — was already built, just never wired in

Found `buildShareGrid()` fully implemented with the right reasoning
(spoiler-free, one square per round, nothing that helps someone else game
tomorrow's Daily) — but `DailyRunner` never actually called it. One-line
fix. Worth knowing this pattern happened once already this session
(Memory Grid) — there's real value already built into this codebase that
isn't always reaching the screen.

## Leagues — an actual weekly cycle now, not a static leaderboard

This was the biggest structural gap from the critique. New:
- `getWeekStart`/`getWeekEnd` helpers — Monday-start UTC weeks, a shared
  clock for the whole league rather than per-player local time (a
  league's "this week" needs to mean the same thing to everyone in it).
- `/api/leagues/[id]/weekly` — live current-week standings, computed the
  same way the old single-Daily leaderboard was, just summed across every
  Daily closed within the current week.
- A weekly snapshot cron (`league-weekly-snapshot`), added to
  `vercel.json` alongside the existing `maintenance` cron, using the same
  `CRON_SECRET` + Bearer-header convention already established — archives
  each week's final standings once it ends, so history actually
  accumulates instead of only ever showing "right now."
- The league detail page rewritten to show this week's live standings
  plus a "recent weeks" history list with each week's winner.

## A correction to something I said last message

I'd flagged automated Daily closing as still missing. Checked the actual
code before building anything else this time — it's not missing. The
adopted `/api/cron/maintenance` route already seeds, closes (correctly
respecting the local-midnight worldwide-close logic), and runs practice
calibration, hourly. That flag was stale; wanted to correct it rather
than let it stand.

## Also worth knowing

This codebase's Supabase client is typed `SupabaseClient<any>` (a
deliberate fix from the V7 hardening pass) — meaning the "unknown"-typed
column values that caused several build failures earlier in this project
structurally can't happen here anymore. Good to have confirmed directly
rather than assumed.

## What's genuinely not done yet

**Push notifications** — the last item from the critique, and the
biggest. Not started. Real infrastructure needed: VAPID keys, a
subscriptions table, service worker push handling, a send mechanism. This
is also the one piece I have no way to verify actually delivers a
notification without a real device test — flagging that now so it's not
a surprise later.

## What to test

- Play the Daily and confirm the streak badge appears on the home screen
  even without having just played (revisit home fresh).
- Share a Daily result and confirm the colored square grid actually shows
  up in the share text now.
- Create a league with a second identity (incognito/different browser),
  have both play a Daily, then check `/leagues/[id]` shows "THIS WEEK"
  standings.
- Manually trigger the weekly snapshot from `/admin` — sign in, go to the
  LEAGUES section, click "RUN WEEKLY SNAPSHOT NOW." This uses real admin
  auth (not the cron's `CRON_SECRET`), added specifically so this is
  actually testable from a browser rather than needing a header-setting
  tool. Confirm `league_weekly_results` gets populated in Supabase
  afterward.

Run migration `0006` before deploying this.
