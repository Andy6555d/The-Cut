# V9.1 build fix

This patch fixes the Vercel TypeScript failure in `app/api/admin/leagues/route.ts` caused by Supabase's untyped/generic response exposing `league.id` as `unknown` to TypeScript.

The route now gives the selected league rows an explicit local type before using `league.id` in the member-count query.

The obsolete player email/magic-link account page remains removed/redirect-only from V9. The first build log showing `emailRedirectTo` came from an older commit; the later build progressing past that file confirms the V9 account removal is present.

Also normalised `end` flex alignment in `app/globals.css` to `flex-end` where present to avoid the Autoprefixer warning.

No database migration is required for this patch.
