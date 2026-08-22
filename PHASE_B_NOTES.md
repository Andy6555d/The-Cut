# THE CUT — Phase B: Microgame Engine + First 3 Games

## What's new since Phase A

- **Microgame engine contract** (`lib/microgames/engine/types.ts`): the shared
  `Microgame` / `ServerScorer` interface every game implements, per
  ARCHITECTURE.md §8.
- **Three playable games**, each with a client component (renders + captures
  input) and a server scorer (a pure, independently-testable function that
  recomputes the score from raw events — never trusts a client-reported
  number):
  - **REACT** — `lib/microgames/react/` — reaction time
  - **STOP** — `lib/microgames/stop/` — precision timing against a target
  - **CENTRE** — `lib/microgames/centre/` — tap the true centroid of an
    irregular shape (not just its bounding-box middle)
- **Practice mode only** — `/practice` and `/practice/{react,stop,centre}`.
  No ranking, no official attempt, no cutoffs involved — purely local
  personal-best tracking via `localStorage` (see
  `lib/microgames/engine/personalBests.ts`). Official Daily play is Phase C.
- **Visual identity established**: near-black background, a mint "survive"
  / hot "cut" color pair, Space Grotesk for headlines and Space Mono for
  scores (tabular figures so digits don't jitter mid-timing-game) — all as
  CSS custom properties in `app/globals.css`, so future screens reuse the
  same tokens rather than re-deciding colors per page.
- **Unit tests for every scorer** (`tests/*.scorer.test.ts`) — per
  ARCHITECTURE.md §52 ("tests for scoring"), covering the score formula,
  the plausibility/anti-cheat bounds, and the polygon-centroid math for
  CENTRE specifically (verified against a square, where the true centroid
  is trivially checkable by hand).

## A transparency note on testing this delivery

My sandboxed environment's `npm install` is blocked by network policy here
(even fetching `typescript` itself from the npm registry returned 403), so
I could not run `npm run build` or `npm test` myself before handing this
over. I did the next best thing: a careful manual read-through of every new
file, plus an automated bracket/brace-balance pass across all of them to
catch gross syntax breakage. I did find and fix one real bug this way — a
circular CSS variable definition in `globals.css` that would have silently
broken every font on the page. I'm flagging this limitation rather than
implying a green test run that didn't happen; Vercel's own build (which
does have full npm access) is the real first compile of this code, so
treat the first deploy as the actual test.

## Deploying this

Same flow as Phase A:

1. On github.com, open your `The-Cut` repo → **Add file → Upload files**.
2. Drag this whole folder in — it will update existing files (like
   `app/layout.tsx`, `app/globals.css`, `app/page.tsx`) and add the new
   `lib/microgames/`, `app/practice/`, and `tests/` directories.
3. Commit to `main`. Vercel will build automatically.
4. Watch the build log this time, since it's genuinely the first real
   compile of this code — if TypeScript catches anything I missed in
   review, it'll show up there. Send me the log if it fails; that's much
   faster to fix from than guessing.
5. Once it deploys, visit `/practice` on your live site and try all three
   games on your phone.

## What to actually check once it's live

- **REACT**: wait for the flash, tap immediately — do you get a plausible
  millisecond value? Tap early on purpose — do you get "TOO SOON"?
- **STOP**: the counter should visibly hide partway through (you're timing
  by feel for the last stretch, not reading the number off).
- **CENTRE**: the shape should look genuinely irregular each time (not a
  regular hexagon) — the whole point is that eyeballing the bounding-box
  middle should NOT be the same as the true answer.
- All three should show a **Personal best / Average / Today's practice**
  summary after each run, and remember it across runs on the same device
  (not across devices — that needs an account, which is a later phase).

## What's intentionally not here yet

- No official Daily, no cutoffs, no ranking — these games aren't wired to
  the `attempts`/`cutoffs`/`daily_results` tables from Phase A yet. That's
  Phase C.
- Only 3 of the 10 planned games. The remaining 7 (EXACT, HALF, BIGGER,
  MEMORY GRID, COUNT, DON'T TAP, TRACE) are Phase D.
- No sound/haptics yet (§30) — visual feedback only for now.

Once you've confirmed all three games play correctly on your phone, tell me
and I'll start Phase C: the Daily engine itself — attempt lifecycle, the
fixed pre-publish cutoff system we locked in, and the countdown.
