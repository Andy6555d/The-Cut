# THE CUT V9.3 — Build stability fix

This version fixes the recurring Next.js/Supabase TypeScript build failures at their source rather than patching one route at a time.

## Root cause

The project uses `@supabase/supabase-js` without generated `Database` types. In that configuration, selected row fields can be inferred as `unknown`. Passing a selected ID into a later `.eq(...)` then triggers Next.js production type-check failures such as:

`Argument of type 'unknown' is not assignable to parameter of type '{}'`.

## Fix

- `lib/db/supabase-server.ts` now defines the server-side Supabase client as an intentionally untyped database boundary (`any`) until generated Supabase Database types are introduced.
- This removes the false `unknown` propagation across all server routes/domain services at once, instead of chasing the same error table-by-table.
- `app/api/practice/attempt/route.ts` additionally normalises selected IDs with `String(...)` before cross-table use/inserts.
- `lib/domain/daily-generation/seedDailyForDate.ts` does the same for game/version IDs.
- The previous V9 sharing changes, player-login removal, admin auth, Practice recording, automatic Daily maintenance, all 10 official games, adaptive Practice and weekly difficulty remain intact.

## Deployment

No Supabase migration is required for this build-stability release.

Replace the project with this ZIP and deploy normally through GitHub/Vercel.

## Future cleanup

The ideal later improvement is to generate Supabase `Database` TypeScript types and replace the intentionally untyped DB boundary with those generated types. That is a code-quality improvement, not required for beta functionality.
