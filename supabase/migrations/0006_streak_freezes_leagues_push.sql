-- THE CUT — streak freezes, weekly league history, push subscriptions
-- Run once in Supabase Dashboard → SQL Editor, after 0001-0005.

-- Streak freezes — EARNED only, never purchasable, per the original
-- non-negotiable rule that streaks are "never sold or manipulated."
-- Auto-consumed on a missed day with no user action required (a player
-- who missed a day is, by definition, not opening the app to spend
-- anything at the moment it would matter).
alter table streaks add column if not exists freezes_available int not null default 0;

-- Weekly league standings, snapshotted once each week closes. The LIVE
-- current week is always computed fresh from attempts/daily_results (same
-- pattern the existing league leaderboard already uses) — this table only
-- stores the historical record once a week is over, so past weeks remain
-- visible and a league can build up a real history rather than only ever
-- showing "right now."
create table if not exists league_weekly_results (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references leagues(id),
  week_start_date date not null, -- Monday of that week, UTC
  player_id uuid not null references players(id),
  rounds_survived_total int not null default 0,
  dailies_played int not null default 0,
  rank int not null,
  created_at timestamptz not null default now(),
  unique(league_id, week_start_date, player_id)
);
create index if not exists idx_league_weekly_results_league_week
  on league_weekly_results(league_id, week_start_date);

-- Web Push subscriptions. One player can have several (multiple devices/
-- browsers). No PII beyond what the browser's Push API itself provides.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_player on push_subscriptions(player_id);

alter table league_weekly_results enable row level security;
alter table push_subscriptions enable row level security;
-- Same posture as every other table — server routes use the service-role
-- key and bypass RLS; no public policies yet.
