-- THE CUT — streak reminder dedup
-- Run once in Supabase Dashboard → SQL Editor, after 0001-0006.

-- Tracks the last date a "streak at risk" push was sent to a player, so
-- the hourly reminder check never sends more than one per local day even
-- though it re-evaluates every player every time it runs.
alter table streaks add column if not exists last_reminder_sent_date date;
