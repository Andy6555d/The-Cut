# THE CUT — Immersive UX V3

This build keeps all V2 scoring/result/polish work and adds the next jeopardy + naming + practice-retention pass.

## Player-facing game names
Internal slugs/database IDs are deliberately unchanged for compatibility.

- `react` → **SNAP**
- `stop` → **STOP**
- `exact` → **ZERO**
- `centre` → **CORE**
- `half` → **HALF**
- `bigger` → **MORE**
- `memory-grid` → **FLASH**
- `count` → **COUNT**
- `dont-tap` → **NOPE**
- `trace` → **TRACE**

## Jeopardy changes
- HALF: 3-2-1-GO before the target appears; result also captures decision time.
- CORE: 3-2-1-GO; precision and response time are both shown.
- MORE: 3-2-1-GO; correct choice is mandatory and speed ranks correct answers.
- FLASH: 3-2-1-GO before the memory pattern is shown; recall accuracy dominates, completion speed breaks ties.
- COUNT: five-second answering deadline with a live danger bar. Accuracy dominates; speed breaks ties. Timeout is a failed result.
- TRACE: ten-second live deadline. The clock starts when the round starts, so hesitation counts. 90% accuracy is still the gate; after the gate, faster clean traces score better. Timeout finalises the current trace.
- NOPE: removed misleading “fastest withheld” practice behaviour. Practice now tracks a 0–1000 control score; a correct no-go earns control rather than a fake time.

## Stickiness / practice changes
- Practice home uses the new names and clearer game identities.
- Added Quick Play entry point that sends the player straight into a random skill game.
- Added training-loop stats and stronger PB/Top 1% messaging.
- Home now exposes Practice and Quick Play beside the Daily and explicitly explains the train → daily → Cut loop.
- New countdown and jeopardy animations, glow, danger pulse, more colour and mobile-responsive compact layouts.

## Compatibility
Internal microgame IDs remain unchanged so existing Daily definitions, API routes, scorers and database rows do not need a rename migration.
