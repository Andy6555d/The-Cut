# THE CUT — Hamburger Menu + Sound as Anticipation

## What I found before fixing anything

Checked before touching anything: the sound module (`sound.ts`) existed
and was well-built, but it was **only wired into the Daily's own result
screen**. None of the 10 individual game components called it at all —
meaning Practice mode and the new Levels mode had zero sound, ever, no
matter how many times you played. Worth knowing since "sound is missing
in practice" would otherwise look like a mystery later.

## Sound is now wired into every game, not just the Daily wrapper

All 10 games (`react`, `stop`, `centre`, `exact`, `half`, `bigger`,
`memory-grid`, `count`, `dont-tap`, `trace`) now play `soundGood()` or
`soundBad()` at their own result moment, using the exact same
plausible/correct condition each game already passes to `hapticResult` —
so sound and haptics always agree, never contradict each other.

## Sound and haptics as an anticipator — the actual ask

Two new primitives in `sound.ts`:
- **`soundAnticipationBuildup(durationMs)`** — schedules a whole rhythmic,
  accelerating tick sequence up front on the Web Audio clock (not chained
  JS timeouts, so the rhythm stays precise) — a heartbeat that quickens
  as the reveal approaches, not a flat repeating beep.
- **`soundGo()`** — a distinct, brighter release tone for the exact
  instant the wait resolves — the payoff, deliberately different from
  every anticipation tick so it reads as the moment, not another tick.

Matching haptic primitives (`hapticAnticipationTick`, `hapticGo`) — lighter
than the existing result pulses, since a countdown beat and a scored
outcome should feel different.

Wired into the two places this actually matters:
- **`ReadyCountdown`** (currently used by Flash/memory-grid, shared by any
  future game that wants a "3…2…1…GO" countdown) — each number now has a
  tick (rising pitch) and haptic; GO gets the bright release tone.
- **REACT** — the classic "wait for it, don't jump the gun" game. The
  full accelerating build now plays across its entire random wait, ending
  right as the stimulus appears.

Didn't add the full build-up to DON'T TAP's per-trial wait — at 8 trials
in roughly 6 seconds total, a full tension buildup on every single trial
would be exhausting rather than exciting. Worth revisiting if you want it
there too, but I made a deliberate call to leave it out for now.

## The hamburger menu

`HamburgerMenu` is mounted once, in the root layout — meaning it's on
**every page**, including Daily, Levels, and How to Play, which
previously had no persistent navigation at all and were genuine dead
ends unless you happened to tap a specific link on that screen.

Every destination is in it: Home, Play Today's Cut, Levels, Practice,
Quick Play, Leaderboard, Leagues, How to Play — plus a sound on/off
toggle at the bottom, consolidating the toggle logic that previously only
lived inline inside the practice summary screen.

Placement note: it's top-right, deliberately clear of the inline
back-chips that already sit top-left in several page headers (leaderboard,
leagues, how-to-play) — nothing overlaps. The home screen's old standalone
"How to Play" corner icon is gone since that page is now just one entry
in this menu — no more two different ways to reach the same thing.

Kept the existing 5-item bottom nav as-is on Home/Practice/Leaderboard/
Leagues rather than replacing it — it's already good, tested, one-handed-
reachable navigation for the most-used destinations. The hamburger is the
"everything, from anywhere" option; the bottom nav is the "the few things
you'll tap constantly" option. Both make sense together.

## What to test

- Play REACT a few times — you should hear (and feel) the tension build
  during the wait, then a distinct bright tone the instant it flips to
  "NOW."
- Play Flash (memory-grid) and listen through its 3-2-1 countdown.
- Play any game in Practice mode (not just Daily) and confirm you now
  hear a result sound — this genuinely didn't happen before.
- Tap the hamburger icon (top-right) on the Daily screen, the Levels
  screen, and How to Play — confirm it opens on all three, since those
  pages had no nav before at all.
- Toggle sound off from the menu, confirm it actually silences everything
  (games, anticipation, results) — the existing on/off flag is shared
  across all of it.

No new environment variables, no new migration.
