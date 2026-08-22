# THE CUT — Flash Grid Size + Input Timer, Nope Multi-Trial Rework

## Why Flash "reverted" to 9 squares

Not a regression from re-uploading — the adaptive practice-difficulty
system (`adaptiveDifficulty.ts`) was clamping grid size to 3×3 for
anyone at practice level 1–3 (level increases every 3 completed runs),
regardless of the 4×4 base config. A new or lightly-practiced player
would always start at 9 squares no matter what the base config said.

Fixed: the floor is now 4×4 (16 cells) at every level; level 5–8 goes to
5×5, level 9–10 to 6×6. It ramps up now instead of ramping down.

## Flash now has a 5-second recall countdown

Previously there was a countdown before the pattern *appeared*, but no
time pressure once you were actually selecting cells — you could take as
long as you wanted. Now, the moment recall starts, a visible countdown
begins (starts at 5.000s, defaults `answerDeadlineMs: 5000`, turns red
under 1.5s remaining) and running out submits whatever's selected so far
— unselected pattern cells count as errors, same as always, so timing out
is simply a bad but valid result, not a crash or a free pass.

## Nope is now a real multi-trial sequence

Previously: one stimulus, one response, done. Now: **8 trials** in a row
per round, each with a fixed **500ms response window** — respond (tap or
don't) and it moves to the next trial immediately, or the window expires
and it moves on regardless. The sequence is randomized but never more
than two of the same kind (tap/don't-tap) in a row, so it can't be
guessed from a pattern.

Scoring follows the same convention already used for FLASH: **accuracy
dominates, speed only breaks ties** — each wrong trial (a miss on a go,
or a false alarm on a no-go) costs the equivalent of 10 seconds, so a
fast-but-wrong run can never beat a slower, fully correct one. The
practice personal-best is a 0–1000 control score, same pattern as the
other composite games.

## What to actually test

- **FLASH**: confirm it's 16 squares (4×4) even as a first-time/low-level
  player, and that a visible countdown runs during cell selection,
  ending the round if you run out of time.
- **NOPE**: confirm you get 8 quick trials in a row, each moving on
  immediately once you respond (or after ~500ms if you don't), and that
  the end screen shows something like "7/8" with an error count — not
  just a single pass/fail.

No new environment variables, no new migration — this is all client/
scoring logic. Same upload flow as before.
