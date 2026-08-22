# V6 — Adaptive Practice + Weekly Pressure

## What changed
- Practice is still unlimited and PBs remain permanent.
- Practice now has 10 adaptive training levels. Every 3 recorded completed runs advances that game's level, capped at 10.
- Difficulty changes by mechanic, not just a generic multiplier: smaller visual differences, shorter timers/reveals, tighter accuracy, hidden timing feedback, larger memory/count loads.
- MORE now uses a configurable decision clock and reaches 0.5 seconds at Level 10. Its default is 0.5 seconds.
- Home and Practice show visible progression banners.
- The Cut now has a weekly pressure cycle: Sunday CHALLENGING, Monday CHALLENGING+, Tuesday HARD, Wednesday HARD+, Thursday VERY HARD, Friday BRUTAL, Saturday ELITE.
- Weekly pressure resets on Sunday at the player's local midnight from the player's perspective. Daily eligibility remains one attempt per local calendar day.
- New Dailies seeded by the admin route use progressively tighter fixed cutoffs/configuration as the week advances. Once published, a day's cutoffs do not move.

## Important beta note
Already-seeded Daily rows keep their existing fixed cutoffs by design. This is necessary for competitive fairness. Seed future dates after deploying V6 to get the new weekly curve. Do not mutate a live Daily's cutoffs after players have attempted it.

## Calibration
The weekly values are beta calibration values, not population-derived thresholds. Use beta analytics to tune them. The architecture should later replace bootstrap values with observed distributions.
