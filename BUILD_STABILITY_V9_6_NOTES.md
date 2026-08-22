# V9.6 build stability fix

Vercel exposed a concrete TypeScript shape mismatch in `lib/domain/daily-generation/seedDailyForDate.ts`.

The existing lookup selected `id,enabled`, which caused TypeScript to infer the mutable `game` variable as a row containing both fields. The create-on-missing branch selected only `id`, then assigned that narrower row back to `game`, producing `Property enabled is missing`.

The insert branch now also returns `id,enabled`, so both branches have the same row shape. No database migration is required.
