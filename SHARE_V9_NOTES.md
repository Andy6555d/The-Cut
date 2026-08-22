# THE CUT V9 — Public score sharing, login paused

## What changed

- Player-facing social/email login has been removed for now.
- `/account` redirects back to the Home screen.
- Admin authentication remains unchanged and can still use the secure admin email flow.
- Practice and Daily result screens now open a real share sheet.
- Share options: LinkedIn, WhatsApp, device share sheet, Copy.
- Every score share uses a dedicated `/share/result?...` page.
- That result page publishes Open Graph title/description metadata containing the game and result. This means LinkedIn receives a result URL whose preview can show the score/result rather than merely linking to the generic game homepage.
- The public result page has a clear CTA back into THE CUT.

## LinkedIn behaviour

The LinkedIn button opens LinkedIn's standard off-site share flow with the dedicated result URL. LinkedIn controls the final composer and may choose exactly how much preview text to display, but THE CUT now supplies result-specific Open Graph metadata for the URL it crawls.

## No database migration

V9 needs no Supabase migration.

## Deployment

Deploy the whole project as normal. No Facebook, LinkedIn, Google or Instagram OAuth provider setup is required for players in this version.
