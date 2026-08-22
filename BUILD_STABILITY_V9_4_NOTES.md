# V9.4 strict-build stability fix

This build fixes the actual TypeScript boundary issue that caused Vercel to expose a new error after each previous patch.

## Root cause
`getSupabaseServerClient()` had been changed to return plain `any`. That removed the `unknown` row-field errors, but it also erased Supabase query-builder method signatures. Under `strict: true`, callbacks over returned query data could then become uncontextualised and trigger `TS7006: Parameter implicitly has an any type`.

## Fix
- The central server client now returns `SupabaseClient<any>` and calls `createClient<any>()`.
- This keeps a loose database schema until generated Supabase Database types are added, but preserves Supabase's actual method signatures and contextual typing.
- The admin metrics route also has explicit row shapes for analytics/cohort data.
- Prior explicit cross-table ID normalisation remains in place.

No database migration is required.
