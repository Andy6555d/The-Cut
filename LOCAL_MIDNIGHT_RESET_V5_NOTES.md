# THE CUT — V5 Local-Midnight Daily Reset

## Product rule now enforced

Every player can play **PLAY TODAY'S CUT once per local calendar day**.
Their eligibility resets at **00:00 (midnight) in the timezone reported by their browser/device**.

Examples:
- Europe/Dublin resets at Dublin midnight.
- America/New_York resets at New York midnight.
- Australia/Sydney resets at Sydney midnight.

The browser sends its IANA timezone (for example `Europe/Dublin`) on the Daily lookup and attempt-start request. The server converts the current instant to that timezone and selects the `dailies.daily_date` matching the player's local `YYYY-MM-DD`.

## Database enforcement

Run this migration in Supabase SQL Editor before deploying the code:

`supabase/migrations/0003_local_midnight_daily_reset.sql`

It adds:
- `players.timezone`
- `players.timezone_updated_at`
- `attempts.local_play_date`
- `attempts.player_timezone`
- a unique database index on `(player_id, local_play_date)`

That unique index is the hard database rule preventing a second official attempt on the same local day.

The existing `(player_id, daily_id)` uniqueness remains too.

## Countdown

The Home/Daily countdown now uses the phone/browser's actual next local midnight rather than UTC midnight. `Date.setHours(24,0,0,0)` is used so daylight-saving transitions follow the device's local timezone correctly.

Practice's "today" statistics also now use the player's local date.

## Daily content / worldwide operation

A Daily is still stored by calendar date, e.g. `2026-08-21`.
A player whose local date is `2026-08-21` receives that Daily regardless of the current UTC date.

Because the world spans many timezones, more than one dated Daily can legitimately be `live` at the same time. The API always selects the one matching the player's local date.

For the current manual beta seeder you can now seed a specific date:

`/api/admin/seed-daily?secret=YOUR_SECRET&date=2026-08-21`

Before a friends/family test, seed the dates the test will span. For a global test, keep at least **yesterday, today and tomorrow (UTC calendar dates)** available because at a given instant players around the world can occupy adjacent local dates.

Automatic ahead-of-time Daily generation is still an Admin/Scheduler task for the later automated phase.

## Final worldwide ranking

Do NOT finalise a calendar-date Daily at UTC midnight anymore.
The same local date is still active in some timezones after UTC midnight.

The close route now accepts:

`/api/admin/close-daily?secret=YOUR_SECRET&date=2026-08-21`

and refuses to close the Daily until that local calendar date has ended everywhere (12:00 UTC on the following date, covering UTC-12), unless `force=true` is explicitly supplied for beta testing.

Example beta-only forced close:

`/api/admin/close-daily?secret=YOUR_SECRET&date=2026-08-21&force=true`

Do not use `force=true` for real worldwide ranking.

## Timezone switching / anti-abuse

The player timezone is recorded on the player and on each official attempt. A casual browser game cannot make device timezone spoofing impossible without invasive fingerprinting. The database still blocks more than one attempt for the same resolved local date, and recorded timezone changes give us an audit trail for stronger abuse rules later if real traffic shows it is necessary.

## Deploy order

1. Supabase → SQL Editor → run `0003_local_midnight_daily_reset.sql`.
2. Deploy this complete project to Vercel.
3. Seed the required calendar date(s) with the updated seed route.
4. On a phone, open `/daily` and play once.
5. Try again: it must show **ALREADY PLAYED** and count down to local midnight.
6. After local midnight, the next calendar-date Daily should be available provided that date has been seeded/published.
