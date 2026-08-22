-- THE CUT — local-midnight Daily eligibility
-- Run once in Supabase Dashboard → SQL Editor after migrations 0001 + 0002.
-- This migration is additive and safe to re-run.

alter table players
  add column if not exists timezone text,
  add column if not exists timezone_updated_at timestamptz;

alter table attempts
  add column if not exists local_play_date date,
  add column if not exists player_timezone text;

-- Existing attempts inherit the calendar date of the Daily they belong to.
update attempts a
set local_play_date = d.daily_date
from dailies d
where a.daily_id = d.id
  and a.local_play_date is null;

-- Make the rule explicit at database level: one official attempt per player
-- per LOCAL calendar date. The existing unique(player_id, daily_id) remains
-- useful too because one Daily exists per calendar date.
create unique index if not exists idx_attempts_player_local_play_date
  on attempts(player_id, local_play_date)
  where local_play_date is not null;

create index if not exists idx_attempts_local_play_date
  on attempts(local_play_date);

create index if not exists idx_players_timezone
  on players(timezone);
