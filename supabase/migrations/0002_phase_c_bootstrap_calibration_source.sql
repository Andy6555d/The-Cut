-- THE CUT — Phase C migration
-- Run once in Supabase Dashboard → SQL Editor, after 0001.

-- difficulty_calibrations.source only allowed 'practice_pool' or
-- 'daily_history' — both imply real accumulated data. Before any Daily has
-- ever run and before practice attempts are recorded server-side (they
-- aren't yet — practice is local-only, see PHASE_B_NOTES.md), there is no
-- real data to calibrate from. Rather than silently mislabel a hand-picked
-- placeholder as 'practice_pool', add a distinct, honestly-named source so
-- it's always possible to tell a real calibration from a bootstrap guess —
-- and so nothing has to be deleted or relabeled once real data exists.
alter table difficulty_calibrations drop constraint if exists difficulty_calibrations_source_check;
alter table difficulty_calibrations add constraint difficulty_calibrations_source_check
  check (source in ('practice_pool', 'daily_history', 'bootstrap_default'));

-- Same reasoning applies to cutoffs.source, which originally only allowed
-- 'historical' or 'calibration_pool' — neither honestly describes a
-- hand-picked placeholder value either.
alter table cutoffs drop constraint if exists cutoffs_source_check;
alter table cutoffs add constraint cutoffs_source_check
  check (source in ('historical', 'calibration_pool', 'bootstrap_default'));
