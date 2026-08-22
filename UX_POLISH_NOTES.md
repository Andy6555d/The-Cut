# THE CUT — Scoring, Feedback & Visual Polish Upgrade

This build applies the scoring/feedback overhaul requested after mobile testing.

## What changed

- STOP and EXACT now show **target, actual result, absolute error and EARLY/LATE direction** instead of presenting the error as if it were the player's time.
- All 10 microgames now return semantic player feedback for the result UI (target/result/error/direction/accuracy/rating/message where applicable).
- Practice results have been rebuilt as a premium game-style result card with performance tiers, accuracy bars, clearer personal stats, explicit **BEST ERROR / FASTEST** labels, and improvement deltas.
- New personal bests now trigger a dedicated celebration layer with confetti, glow, stronger visual hierarchy, haptics and a procedural four-note celebration sound.
- Good/bad results have distinct procedural sound effects. Sound is optional and can be toggled from result screens; no external audio assets are required.
- Practice intros and game stages have received a darker neon/glass visual treatment, animated ambience and stronger call-to-action styling.
- Official Daily result feedback now uses the same semantic result data and clearly separates the player's result from the **server-authoritative survival cutoff**. It states how far the player was inside or outside the cut.
- Daily survive/cut moments have stronger visual, haptic and audio feedback, and the result hold time is longer so players can actually read the feedback.

## Scoring meaning

The stored `rawScore` remains exactly what the authoritative scorers use. This upgrade does **not** change competitive scoring formulas or fixed Daily cutoffs. It changes how those numbers are explained to humans.

Examples:

- EXACT target 3.000s, held 2.407s -> `rawScore = 0.593`, displayed as **2.407s / 0.593s EARLY**.
- STOP target 5.000s, stopped 5.142s -> `rawScore = 0.142`, displayed as **5.142s / 0.142s LATE**.
- HALF -> player cut location, true half and LEFT/RIGHT error.
- COUNT -> player's guess, actual count and SHORT/OVER error.
- MEMORY GRID -> matched cells / total and number of errors.
- REACT -> reaction milliseconds plus a human performance band.
- CENTRE / TRACE -> deviation plus approximate accuracy.
- BIGGER / DON'T TAP -> explicit correct/wrong outcome plus reaction where relevant.

## Important integrity note

Official Daily survival remains calculated by the server using `rawScore` and the fixed cutoff. Client feedback is explanatory UI only and does not decide survival.
