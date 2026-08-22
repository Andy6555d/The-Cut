-- THE CUT — display names + leagues
-- Run once in Supabase Dashboard → SQL Editor, after 0001, 0002, 0003.

-- Free-form, player-chosen display names. Duplicates are explicitly
-- allowed (per IMMERSIVE_UX_V4's own decision) — identity remains the
-- internal player id, this is presentation only. No PII: nothing forces
-- a real name, and nothing here is required to play.
alter table players add column if not exists display_name text;

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid not null references players(id),
  created_at timestamptz not null default now()
);

create table if not exists league_members (
  league_id uuid not null references leagues(id),
  player_id uuid not null references players(id),
  joined_at timestamptz not null default now(),
  primary key (league_id, player_id)
);
create index if not exists idx_league_members_player on league_members(player_id);

alter table leagues enable row level security;
alter table league_members enable row level security;
-- No public policies yet — same posture as every other table so far
-- (server routes use the service-role key and bypass RLS; the anon key
-- can't touch these tables directly until a public policy is added).
