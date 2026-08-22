# THE CUT — Immersive UX / Scoring Pass v2

This pass is built on top of the previous UX/scoring upgrade and keeps the existing backend architecture intact.

## Scoring clarity
- STOP / EXACT continue to show target, actual result, signed early/late error and accuracy.
- BIGGER now explicitly treats reaction time as part of the result and shows a 0–1000 performance score.
- MEMORY GRID now scores accuracy first and completion speed second. One memory error carries a large score penalty so a fast wrong answer cannot beat a correct slower answer.
- COUNT now scores count accuracy first and answer speed second using the same principle.
- TRACE now has an explicit accuracy threshold (90% in practice). Below the threshold the attempt receives a large penalty; above it, time and remaining accuracy both contribute to the score.
- Practice PBs for MEMORY GRID, COUNT and TRACE now use the combined 0–1000 performance score so faster equally-accurate runs can create new PBs.

## Result UX
- Added performance score, secondary metrics, timing, accuracy thresholds and clearer coaching.
- Result pages now use real scrollable phone-safe layouts instead of allowing lower content/buttons to cover result content.
- Reduced vertical waste and added short-height responsive rules for phones with browser chrome/navigation bars visible.
- New PB celebration, confetti, sound and haptics from the previous pass remain intact.

## Home
- Rebuilt into a much more colourful game dashboard with THE CUT brand lock-up, animated live indicator, world-ring treatment, countdown, bright Daily CTA, practice CTA, local practice stats and persistent bottom navigation.

## Practice hub
- Rebuilt the plain card list into a neon arcade-style training hub.
- Every game gets its own accent colour/icon, category, current personal best and clear gameplay promise.
- Added training-loop summary and quick-fire CTA.

## Practice intros / gameplay
- Per-game accent colours now carry into each practice intro.
- More ambient glow, motion, depth and responsive feedback across the shared game stage.

## Integrity
- Official scoring remains server-authoritative.
- The new composite MEMORY GRID / COUNT / TRACE scorer logic is implemented in both the shared scorer and client feedback path.
- Existing Daily fixed-cutoff architecture is not replaced; new composite games must be calibrated before being used in a published Daily, as already required by the architecture.
