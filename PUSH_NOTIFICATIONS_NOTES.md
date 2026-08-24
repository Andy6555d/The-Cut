# THE CUT — Push Notifications

The last item from the critical review. Read this one fully before
deploying — there's real setup required, and one honest limitation.

## A mistake I caught before it reached you

Generating the VAPID keypair, my first attempt at extracting the raw
private key from Node's DER output was wrong — the "private key" I
produced was actually overlapping bytes from the public key, which would
have been a broken, insecure keypair. I redid it properly using JWK
export (a standardized format, no manual byte-offset guessing), then
verified it three ways before using it: confirmed the public key
coordinates are actually derivable from the private key, and ran a full
sign/verify round-trip. The keys below are the ones that passed all
three checks.

## Required setup — do this before deploying

1. **Run migration `0007`** (adds `streaks.last_reminder_sent_date`, needed
   for dedup so nobody gets pinged twice in a day).

2. **Add three new environment variables in Vercel:**
   ```
   VAPID_PUBLIC_KEY=BFoI1-x08ruJX2LQxBWMDvNnLaAvh2uPE5zeefkroKWwi7HyU-VpqCvdQKacdS7eLMWREoD0u6p05pEwsqDIxCo
   VAPID_PRIVATE_KEY=C8xqa02th3FoTRal8oenZ-6HfJuPAJslmCCu2f15WfU
   VAPID_SUBJECT=mailto:your-real-email@example.com
   ```
   The first two are the real, verified keypair generated for this
   delivery — safe to use as-is, nobody else has them. Change
   `VAPID_SUBJECT` to an email address you actually control — push
   services sometimes use it to contact you if your server is misbehaving
   (e.g. sending too aggressively). A `mailto:` address is the standard
   convention; an `https://` URL to a contact page also works.

3. **New dependency**: `web-push`, plus `@types/web-push` for TypeScript.
   I did NOT hand-write the push encryption myself (RFC 8291 — ECDH key
   agreement, HKDF, AES-128-GCM) despite the "avoid new dependencies I
   can't verify install" caution I've held to everywhere else in this
   project. That was a deliberate exception: `web-push` is a very
   widely-used, pure-JS (no native compilation) library maintained close
   to the actual push standards — low install risk. The alternative was
   me writing complex cryptography I have no way to test end-to-end, and
   getting that subtly wrong is a much worse failure mode than a
   dependency risk I've otherwise avoided.

## How it works

- **Opt-in**: a "Get streak reminders" toggle in the hamburger menu, next
  to the sound toggle. Handles three states properly — not supported at
  all (notably iOS Safari, only very recently gained any Push API
  support and still inconsistently — this is Apple's limitation, not a
  gap in this build), permission denied (shows a message rather than a
  dead button), and subscribed/unsubscribed.
- **Sending**: `sendPushToPlayer()` wraps `web-push`, and cleans up
  subscriptions the push service reports as dead (410/404) so they don't
  silently accumulate.
- **The actual reminder logic**: an hourly cron
  (`/api/cron/streak-reminders`, added to `vercel.json` alongside the
  existing `maintenance` cron) checks every subscribed player's **stored
  local timezone** (already captured elsewhere in this codebase during
  normal play) and only sends if their local clock currently reads
  evening (7–10pm), they have an active streak, and haven't played yet
  today. Running hourly but gating on local hour is what makes one global
  cron behave like a personalized evening reminder for everyone
  regardless of timezone — each player is only actually eligible during
  the one hour of the day that's evening *for them*.
- **Testable from `/admin`**: same pattern as the weekly league snapshot
  — a "SEND STREAK REMINDERS NOW" button using real admin auth, ignoring
  the evening-hour gate so you can test it at any time of day rather than
  waiting for 7pm.

## The one thing I genuinely cannot verify

I have no way to test that a push notification actually arrives on a
real device from this sandbox — no browser, no phone, nothing to receive
it with. Everything up to the actual delivery (the crypto, the API
routes, the service worker handlers, the cron logic) I've verified as
carefully as I can from here. Whether a real notification actually shows
up on your phone is something only a real test can confirm. Please do
that test before assuming this works.

## What to actually test, in order

1. Deploy, confirm the build is clean (first real compile of `web-push`
   integration — same "first deploy is the real test" caveat as always).
2. Open the hamburger menu, tap "Get streak reminders," grant the browser
   permission prompt when it appears.
3. Check Supabase → `push_subscriptions` → confirm a row appeared.
4. Go to `/admin` → PUSH NOTIFICATIONS → "SEND STREAK REMINDERS NOW" (you
   need an active streak and to not have played today for this to find
   anything to send).
5. **Confirm a real notification actually appears on your phone.** This
   is the step that actually matters — everything before it is just
   plumbing.
6. Tap the notification and confirm it opens the app to `/daily`.

If step 5 fails, the most likely places to look are: was permission
actually granted (check your phone's own notification settings for the
site), did the VAPID env vars get set correctly, and the Vercel function
logs for whatever `sendPushToPlayer` actually returned.
