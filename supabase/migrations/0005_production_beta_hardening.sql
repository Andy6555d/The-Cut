-- THE CUT — V7 production-beta hardening
-- Run after 0001..0004. Safe to re-run.


-- Ensure the complete 10-game registry exists before practice recording or
-- the V2 Daily generator starts. Existing rows are left untouched.
insert into microgames (slug, category) values
  ('react','reaction'), ('stop','timing'), ('exact','timing'),
  ('centre','precision'), ('half','estimation'), ('bigger','visual'),
  ('memory-grid','memory'), ('count','visual'), ('dont-tap','inhibition'),
  ('trace','coordination')
on conflict (slug) do nothing;

insert into microgame_versions (microgame_id, version, calibration_status)
select id, 1, 'ready' from microgames
where slug in ('react','stop','exact','centre','half','bigger','memory-grid','count','dont-tap','trace')
on conflict (microgame_id, version) do nothing;

-- Server-recorded practice attempts. These are observational training data,
-- never official competitive results.
create table if not exists practice_attempts (
  id bigserial primary key,
  player_id uuid not null references players(id),
  microgame_id uuid not null references microgames(id),
  microgame_version_id uuid references microgame_versions(id),
  practice_level int not null default 1 check (practice_level between 1 and 10),
  raw_score numeric,
  performance_score numeric,
  failed boolean not null default false,
  duration_ms int,
  metadata jsonb not null default '{}'::jsonb,
  played_at timestamptz not null default now()
);
create index if not exists idx_practice_attempts_game_level_time on practice_attempts(microgame_id, practice_level, played_at);
create index if not exists idx_practice_attempts_player_time on practice_attempts(player_id, played_at);

-- Compact real-data calibration by practice level. The Daily generator can
-- prefer these once sample_count is meaningful and fall back to bootstrap
-- values while the beta population is still small.
create table if not exists practice_level_calibrations (
  microgame_version_id uuid not null references microgame_versions(id),
  practice_level int not null check (practice_level between 1 and 10),
  p01 numeric,
  p05 numeric,
  p10 numeric,
  p25 numeric,
  p50 numeric,
  p75 numeric,
  p90 numeric,
  p95 numeric,
  p99 numeric,
  quantiles jsonb not null default '{}'::jsonb,
  sample_count int not null default 0,
  computed_at timestamptz not null default now(),
  primary key (microgame_version_id, practice_level)
);

-- Admin identity is backed by Supabase Auth. We deliberately use an allowlist
-- table rather than a secret embedded in URLs or committed source.
create table if not exists admin_users (
  auth_user_id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

-- Useful indexes for beta operations/analytics.
create index if not exists idx_dailies_status_date on dailies(status, daily_date);
create index if not exists idx_attempts_status_finished on attempts(status, finished_at);
create index if not exists idx_round_results_round on round_results(round_number, survived);

alter table practice_attempts enable row level security;
alter table practice_level_calibrations enable row level security;
alter table admin_users enable row level security;
-- No direct anon policies. All writes/reads go through server routes.
