# THE CUT — Phase D: The Remaining 7 Microgames

## What's new

All 10 games from the original spec are now playable in practice mode:

| Game | Category | What it tests |
|---|---|---|
| EXACT | Timing | Hold for exactly 3.000s — the timer hides partway through |
| HALF | Estimation | Tap the true midpoint of a line, no measurements shown |
| BIGGER | Visual | Tap the larger of two same-colored shapes, fast |
| MEMORY GRID | Memory | Reproduce a briefly-shown pattern from memory |
| COUNT | Estimation | Count objects shown for under a second |
| DON'T TAP | Inhibition | Tap on "go," withhold on "no-go" — shape + color + text, never color alone |
| TRACE | Coordination | Trace a guide circle as precisely as possible |

Each follows the same shape as REACT/STOP/CENTRE: a client component that
renders and captures input, a server scorer that independently recomputes
the score from raw events, and a practice page with the same personal-best
tracking, haptics, and share button.

## A design note worth knowing about

For games with a "correct answer" baked into the round (which side is
bigger, what the true count was, which cells were in the pattern, whether
this was a go or no-go trial), that answer is generated **client-side**
per round and reported alongside the player's response — the server
recomputes the score from whatever the client reports, the same trust
model CENTRE already shipped with in Phase B. This is fine for practice,
where there's nothing to cheat *for*. It stops being fine the moment any
of these games get wired into the **official Daily** (Phase C's engine)
— there, the correct answer needs to come from `daily_rounds` (seeded
server-side, like STOP and REACT's difficulty already work), not be
generated and self-reported by the client. None of these 7 games are
wired into the Daily's `BOOTSTRAP_ROUNDS` yet, so this isn't live-exposed
anywhere yet — but it's the first thing to fix before any of them (or
CENTRE) go into a real Daily round.

## Setup

Same as before — drag the updated folder into the GitHub upload box,
commit, let Vercel build. No new environment variables, no new migration
this time; nothing here touches the database directly.

## What to check once it's live

Visit `/practice` — you should see all 10 games listed. Worth trying each
at least once:

- **EXACT**: does the timer actually hide partway through the hold?
- **HALF**: does the line look genuinely different length/position each
  time (not always centered)?
- **BIGGER**: are the two shapes the same color, differing only in size?
- **MEMORY GRID**: does the pattern actually hide before you can respond?
- **COUNT**: do the dots disappear quickly, and can you still guess close?
- **DON'T TAP**: is it a circle vs. triangle (not just red vs. green) so
  it'd still work for a colorblind player?
- **TRACE**: does dragging around the guide circle feel smooth, not janky?

## What's intentionally not here yet

- None of these 7 are in the Daily yet — `BOOTSTRAP_ROUNDS` still only
  cycles REACT/STOP/CENTRE. Expanding the Daily's round variety, and
  fixing the client-self-reported-answer gap above, are natural next
  steps whenever you want them — not required to keep moving on other
  phases.
- No sound (§30) — still visual/haptic feedback only.

With all 10 games built, the natural next phases are **E** (results
screen polish, streaks, basic leaderboard) or **F** (the real referral/
sharing loop) — or, if you'd rather, tackling the Daily-integration gap
noted above first. Your call on order.
