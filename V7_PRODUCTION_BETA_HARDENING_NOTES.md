# THE CUT — V7 Production Beta Hardening

This build closes the gaps identified after V6 without redesigning the product.

## What changed

### 1. All 10 games are now in the official Daily generator
Future V2 Dailies use all enabled games: SNAP, STOP, ZERO, CORE, HALF, MORE, FLASH, COUNT, NOPE and TRACE. Order is deterministically shuffled per date. Sunday starts difficult, each day tightens through Saturday, and later rounds inside the same Cut also get harder.

Existing already-played V1 Dailies are preserved for fairness. Previously pre-seeded V1 Dailies with zero attempts are automatically replaced with V2 the next time the seeder runs.

### 2. Daily challenge answers/config are server-authoritative
The server now generates and stores the actual challenge configuration for composite games before publication: centre polygon, half line, bigger side, memory pattern, count answer, NOPE sequence and reaction stimulus delay. The browser renders that configuration, but the official score route reloads the database copy and never accepts a client-supplied answer/config.

Plausibility checks were tightened for centre, half, memory and NOPE. A browser game can never be made impossible to automate, but the previous self-reported-answer path is gone.

### 3. Practice is recorded server-side
`practice_attempts` records game, player, practice level, raw score, display performance score, failure and duration. LocalStorage remains the immediate no-latency PB cache.

`/api/practice/stats` hydrates the local cache from server history, so linked accounts can carry training history across devices from V7 onward.

### 4. Practice now calibrates future Daily cutoffs
A daily maintenance job calculates robust per-game/per-level quantiles from real practice scores. Calibration requires at least 50 samples from at least 5 players, and caps each player to 30 samples per game/level in each 90-day calibration window to reduce one-player poisoning.

New Dailies prefer real calibration when enough data exists and fall back honestly to bootstrap values while the beta sample is small. Today's published cutoff never moves.

### 5. Automatic Daily closure/final ranking
`/api/cron/maintenance` runs once daily at 13:15 UTC. It:
- seeds yesterday/today and the next 3 calendar dates,
- safely upgrades untouched V1 pre-seeded Dailies to V2,
- closes any worldwide-expired Dailies,
- calculates final world rank/percentile,
- recalibrates practice data.

Only one Vercel cron is required.

### 6. Real optional Supabase Auth account
`/account` supports email magic-link sign-in. The current anonymous player becomes attached to the auth account. On another device, signing into the same account switches that device to the canonical player identity, preserving future streak/social/training continuity.

Historical official attempts from a second anonymous identity are deliberately not rewritten because that could create duplicate Daily-attempt conflicts.

### 7. Real admin authentication
Admin routes no longer accept `ATTEMPT_TOKEN_SECRET` in query URLs. `/admin` signs in through Supabase Auth. Server routes verify the actual Supabase access token and then require either:
- the auth user in `admin_users`, or
- their email in Vercel `ADMIN_EMAILS`.

`ATTEMPT_TOKEN_SECRET` is now only used to sign official attempt tokens.

### 8. Admin console
`/admin` now shows:
- today's active/new players,
- sessions,
- Daily starts/completions,
- completion rate,
- Practice attempts,
- official attempts,
- D1/D7 retention,
- recent Dailies with force-close control,
- game enable/disable controls for future Dailies,
- league list/member counts.

### 9. Analytics identity fixed
The analytics ingestion route now resolves the actual anonymous/canonical player and writes `player_id`. It also uses server receive time rather than trusting a client-supplied event time. Retention/DAU can therefore be calculated from V7 onward.

### 10. Name input remains free-form
Display names can be any printable name up to 30 characters. Duplicate display names are allowed. Internal UUIDs remain authoritative.

## Deployment — exact steps

### A. Supabase SQL
Open Supabase → SQL Editor → New query.
Run the complete file:

`supabase/migrations/0005_production_beta_hardening.sql`

Do not rerun or delete the earlier migrations instead. V7 is additive.

### B. Supabase Auth
Supabase → Authentication → URL Configuration:
- Site URL: `https://the-cutday.vercel.app`
- Add redirect URL: `https://the-cutday.vercel.app/account`
- Add redirect URL: `https://the-cutday.vercel.app/admin`

Ensure Email auth / magic-link sign-in is enabled.

### C. Vercel environment variables
Keep the existing variables and add:

`CRON_SECRET` = a long random secret

`ADMIN_EMAILS` = your admin email address. Multiple emails can be comma-separated.

Example only:
`ADMIN_EMAILS=owner@example.com`

Do not put the values into `vercel.json` or Git.

### D. Deploy the full project
Deploy this complete V7 project.

The included `vercel.json` has one maintenance cron:
`15 13 * * *`

Vercel supplies `Authorization: Bearer <CRON_SECRET>` automatically to cron requests when `CRON_SECRET` is configured.

### E. First admin login
Visit:
`https://the-cutday.vercel.app/admin`

Enter the exact email configured in `ADMIN_EMAILS`, open the magic link, and return to `/admin`.

### F. Save a player account
Visit:
`https://the-cutday.vercel.app/account`

This is optional for players. Anonymous play still works exactly as before.

## Important beta behavior

- Existing V1 Daily with attempts: preserved.
- Existing V1 future Daily with no attempts: V7 maintenance replaces it with a V2 10-game Daily.
- Published V2 Daily: never changed mid-day.
- Practice PBs remain permanent and unlimited.
- Official Cut remains one attempt per player's local calendar day.
- Weekly difficulty still resets Sunday at the player's local midnight.

## Validation completed here

All 106 TypeScript/TSX files were syntax-transpiled with the TypeScript compiler API: 0 syntax errors.

A full `next build` could not be completed in this environment because npm dependency installation repeatedly timed out. Vercel should therefore be treated as the authoritative full dependency/type/build check on deployment.
