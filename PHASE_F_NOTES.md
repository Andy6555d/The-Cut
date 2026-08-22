# THE CUT — Adopting V6 + Display Names + Leagues

## What happened here

You uploaded a codebase (V2 through V6 of an "Immersive UX" / "Adaptive
Weekly" / "Local Midnight Reset" line of work) that goes well beyond what
I'd built through Phase E — game renaming, jeopardy countdown clocks,
adaptive practice difficulty, a weekly difficulty curve, and a full
rewrite of the scoring-feedback problem you'd flagged. I read through all
of it (notes files plus a full structural sweep of all 93 TS/TSX files —
same bracket-balance and known-regression checks I've been running
throughout this project) and I'm adopting it as the new working baseline
rather than my own Phase E code, since it's a genuine superset covering
ground I was mid-way through building anyway.

## The one thing I flagged and you decided

Local-midnight reset (each player's Daily resets at THEIR midnight, not a
shared UTC one) reverses the UTC-midnight decision you made earlier in
this project. You chose to keep local-midnight, understanding that it
means "today's Daily" is really many parallel per-timezone Dailies
sharing a difficulty schedule, not one single global event. That's
recorded as your deliberate call, not something I talked you into or out
of.

## What I added on top

- **Display names** (migration `0004`): `players.display_name`, free-form,
  duplicates allowed, nothing required to play. `DisplayNamePrompt`
  component, wired into the leaderboard and leagues pages. Leaderboards
  now show a chosen name when set, falling back to the existing anonymous
  `Player #XXXXXX` handle otherwise.
- **Leagues**: create a league, get a short shareable invite code (no
  ambiguous characters — no 0/O/1/I/L), join with a code, see a
  league-scoped leaderboard for the most recently closed Daily. New
  tables `leagues` and `league_members`, three new API routes, two new
  pages (`/leagues`, `/leagues/[id]`).

## A real layout bug I caught before it shipped

The bottom navigation bar was a hardcoded 4-column CSS grid
(`grid-template-columns: repeat(4, 1fr)`). Adding a 5th nav item (Leagues)
without noticing that would've squeezed 5 icons into 4 slots — cut off or
overlapping on real phones. Fixed to `repeat(5, 1fr)` in both places the
nav is rendered (`HomeDashboard.tsx` and `PracticeHub.tsx`).

## Setup

1. Run `supabase/migrations/0003_local_midnight_daily_reset.sql` if you
   haven't already (needed for the code you uploaded to work at all).
2. Run the new `supabase/migrations/0004_display_names_and_leagues.sql`.
3. Deploy this complete project the usual way.

## Reopening today's Daily for real play — read this carefully

Under local-midnight, "today" isn't one date anymore — it depends on each
player's own timezone. Your existing `2026-08-21` Daily being `closed`
only blocks players whose *local* date is `2026-08-21`. To actually let
"everybody" play right now, you need a live Daily for every calendar date
that's currently "today" somewhere in the world:

1. In Supabase → Table Editor → `dailies`: find the `2026-08-21` row,
   change `status` from `closed` back to `live`, clear `closed_at`. (Your
   own test attempt on that date doesn't block anyone else — the
   one-attempt rule is per player, not global.)
2. Seed the adjacent dates too, since someone in Auckland is already on
   `2026-08-22` and someone in Los Angeles may still be on `2026-08-20`:
   - Visit `https://the-cutday.vercel.app/api/admin/seed-daily?secret=YOUR_SECRET&date=2026-08-20`
   - Visit `https://the-cutday.vercel.app/api/admin/seed-daily?secret=YOUR_SECRET&date=2026-08-22`
   (2026-08-21 already exists from step 1, so re-seeding it will just say
   `already_exists` — that's fine, it's already handled.)
3. From here forward, keeping "yesterday/today/tomorrow" (UTC calendar
   dates) seeded and live is what actually means "everybody can play" —
   worth turning into an automated daily cron eventually (Phase G), manual
   for now.

## What I did not touch

I didn't re-verify the adaptive-difficulty, weekly-pressure, or jeopardy-
clock logic beyond the structural sweep (bracket balance, the two known
TypeScript pitfall classes) — I didn't write that code, so "opinion" was
my honest read of it, not a guarantee. First deploy of this combined
codebase is the real test, same as every phase before it — watch the
build log.
