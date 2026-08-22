-- THE CUT — Phase A core schema
-- Run this whole file once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / OR REPLACE.

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- =========================================================
-- IDENTITY
-- =========================================================

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- links to Supabase Auth (auth.users.id) once a player signs up
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  anonymous_key text unique not null,
  account_id uuid references accounts(id),
  country_code text,
  created_at timestamptz not null default now()
);
create index if not exists idx_players_account_id on players(account_id);

-- =========================================================
-- MICROGAMES
-- =========================================================

create table if not exists microgames (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null check (category in
    ('reaction','timing','precision','visual','memory','estimation','inhibition','logic','coordination')),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists microgame_versions (
  id uuid primary key default gen_random_uuid(),
  microgame_id uuid not null references microgames(id),
  version int not null,
  scoring_rules jsonb not null default '{}'::jsonb,
  calibration_status text not null default 'calibrating'
    check (calibration_status in ('calibrating','ready')),
  released_at timestamptz not null default now(),
  unique(microgame_id, version)
);

-- Historical / practice-derived cutoff values feeding future Dailies.
-- This is the ONLY source that determines a Daily's cutoffs — see cutoffs table below.
create table if not exists difficulty_calibrations (
  id uuid primary key default gen_random_uuid(),
  microgame_version_id uuid not null references microgame_versions(id),
  difficulty_config jsonb not null,
  target_survival_pct numeric not null check (target_survival_pct > 0 and target_survival_pct <= 1),
  computed_cutoff_value numeric not null,
  sample_count int not null default 0,
  source text not null check (source in ('practice_pool','daily_history')),
  computed_at timestamptz not null default now()
);
create index if not exists idx_calibrations_version on difficulty_calibrations(microgame_version_id);

-- =========================================================
-- DAILIES
-- =========================================================

create table if not exists dailies (
  id uuid primary key default gen_random_uuid(),
  daily_date date unique not null,
  seed bigint not null,
  status text not null default 'draft' check (status in ('draft','scheduled','live','closed')),
  version int not null default 1,
  created_by uuid,
  approved_by uuid,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists daily_rounds (
  id uuid primary key default gen_random_uuid(),
  daily_id uuid not null references dailies(id),
  round_number int not null,
  microgame_version_id uuid not null references microgame_versions(id),
  difficulty_config jsonb not null,
  target_survival_pct numeric not null check (target_survival_pct > 0 and target_survival_pct <= 1),
  unique(daily_id, round_number)
);

-- FIXED, immutable once the Daily is published. Never recomputed during the live window.
create table if not exists cutoffs (
  id uuid primary key default gen_random_uuid(),
  daily_id uuid not null references dailies(id),
  round_number int not null,
  cutoff_value numeric not null,
  target_survival_pct numeric not null,
  source text not null check (source in ('historical','calibration_pool')),
  computed_at timestamptz not null default now(),
  unique(daily_id, round_number)
);

-- Display-only, updated continuously. Never consulted to decide survival.
create table if not exists live_round_counts (
  id uuid primary key default gen_random_uuid(),
  daily_id uuid not null references dailies(id),
  round_number int not null,
  players_remaining int not null default 0,
  players_survived_so_far int not null default 0,
  updated_at timestamptz not null default now(),
  unique(daily_id, round_number)
);

-- =========================================================
-- ATTEMPTS
-- =========================================================

create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id),
  daily_id uuid not null references dailies(id),
  attempt_token text unique not null,
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','abandoned','invalidated')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(player_id, daily_id) -- enforces ONE official attempt per Daily
);
create index if not exists idx_attempts_daily on attempts(daily_id);

create table if not exists round_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id),
  round_number int not null,
  raw_score numeric not null,
  survived boolean not null,
  server_received_at timestamptz not null default now(),
  client_latency_ms int,
  unique(attempt_id, round_number)
);

create table if not exists daily_results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid unique not null references attempts(id),
  rounds_survived int not null default 0,
  final_percentile numeric,        -- set once, at Daily close
  estimated_percentile numeric,    -- shown live; always labelled as an estimate
  world_rank int,
  is_final boolean not null default false
);
create index if not exists idx_daily_results_daily_final
  on daily_results(final_percentile) where is_final = true;

-- =========================================================
-- ANALYTICS (write path only in Phase A — dashboard comes later)
-- =========================================================

create table if not exists analytics_events (
  id bigserial primary key,
  event_name text not null,
  player_id uuid,
  session_id uuid not null,
  daily_id uuid,
  microgame_id uuid,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists idx_analytics_events_name_time on analytics_events(event_name, occurred_at);
create index if not exists idx_analytics_events_daily on analytics_events(daily_id);

-- =========================================================
-- ROW LEVEL SECURITY (basic Phase A posture)
-- Server routes use the service-role key and bypass RLS.
-- These policies protect against direct client access via the anon key.
-- =========================================================

alter table players enable row level security;
alter table attempts enable row level security;
alter table round_results enable row level security;
alter table daily_results enable row level security;
alter table analytics_events enable row level security;

-- No public policies are created yet in Phase A: with RLS enabled and no policy,
-- the anon key can read/write nothing on these tables. All access goes through
-- server route handlers using the service role key. Public read policies for
-- leaderboards etc. are added when that feature is built (Phase E).
