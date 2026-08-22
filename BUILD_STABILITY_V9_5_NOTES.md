# V9.5 build stability fix

This build addresses the repeated strict-TypeScript failures as a class rather than one route at a time.

- Production tsconfig now includes only `app/**`, `lib/**`, and Next generated types. Accidental scratch files at repository root such as `client (1).tsx` are no longer part of the production typecheck.
- League leaderboard entries have an explicit result type before `.sort()` / `.map()`, eliminating implicit-any callbacks.
- Supabase-crossing callbacks in server/API code are explicitly typed at the intentionally untyped database boundary.
- Daily seeding retains its real `DailyGameSlug` type rather than degrading typed game slugs to `any`.
- CSS `end` alignment warning is normalized to `flex-end` where present.
- No database migration is required.
