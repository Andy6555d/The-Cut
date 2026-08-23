# THE CUT — Round-1 Difficulty Fix + Levels Mode + Flash Timer Balance

## The round-1 problem — genuinely fixed, not just tweaked

Confirmed two compounding causes from reading the actual code, not guessing:

1. **Round 1 never started at an easy difficulty at all.** The formula was
   `weekBase = 4 + floor(day/2)` — meaning even on the gentlest day of the
   week, the opening round started at practice level 4 out of 10. Changed
   to `weekBase = 1 + floor(day/2)`, so Sunday genuinely starts at level 1.
2. **The base cutoff values themselves were picked too optimistically** —
   closer to idealized reaction times than real mixed-population
   performance on a touchscreen. Loosened every `BASE_CUTOFF` value by
   roughly 35-45% (e.g. REACT's round-1-equivalent cutoff moved from
   330ms to 460ms).

Both were real, verified in the code — this wasn't a vague "make it
easier" pass. Worth being honest: this is still a guess, just a much more
generous one, aimed squarely at your real feedback that round 1 was
eliminating almost everyone. The actual fix — real calibration from
accumulated data — is the pipeline already built (`calibratePractice.ts`)
taking over once enough samples exist.

## Flash's timer now compensates for grid size

Your exact ask: "once the extra layer goes in, an extra second should go
on the clock." Implemented in both the Daily's config generator and the
practice adaptive-difficulty system: recall time now gets **+1 second**
when the grid steps from 4×4 to 5×5, and another **+1 second** (+2s
total) at 6×6 — instead of the timer continuing to shrink on top of the
grid getting bigger, which is what was actually happening before.

## Levels — the new third mode

`/levels`, plus a "▲ LEVELS" entry on the home screen and a direct link
from the Daily's elimination screen ("Want something more forgiving? Try
Levels →") — placed exactly where the frustration you described actually
happens.

How it works:
- A random one of the 10 games each level, difficulty ramping smoothly
  across roughly 72 levels (about 8 levels per difficulty tier) — reused
  the same tuned per-game difficulty curves the adaptive practice system
  already has, just spread across far more, smaller steps for a genuinely
  gradual ramp rather than 10 coarse jumps.
- No streak, no ranking, no server involvement at all — entirely local,
  same trust model as practice.
- Miss a level and you retry that exact level, no penalty, no reset to
  level 1 — the whole point is this mode should feel encouraging.
- Your best level ever reached is remembered locally and shown when you
  start a new run.

## What to test

- Play today's Daily a few times (reopen it in Supabase between attempts
  the same way as before) and see if round 1 feels meaningfully more
  survivable now.
- Play Flash a few times until it steps up a grid size — confirm the
  timer visibly gets more generous, not less, when that happens.
- Try Levels from the home screen — confirm the first several levels feel
  genuinely easy, and that missing one just lets you retry it.

No new environment variables, no new migration.
