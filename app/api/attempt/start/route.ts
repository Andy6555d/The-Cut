import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";
import { signAttemptToken } from "@/lib/domain/attemptToken";
import { finalizeAttempt } from "@/lib/domain/competition-engine/finalizeAttempt";
import { dateKeyInTimeZone } from "@/lib/domain/timezone/playerTimezone";

const TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 2; // 2 hours — generous, a Daily attempt is a few minutes

export async function POST(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { playerId, anonymousKey, isNew, timeZone } = await getOrCreateAnonymousPlayer(req);

  // "Today" is the player's LOCAL calendar day, not UTC. This makes the
  // official attempt reset at midnight in the timezone reported by their
  // device/browser. The Daily content itself is keyed by that YYYY-MM-DD.
  const localPlayDate = dateKeyInTimeZone(new Date(), timeZone);
  const { data: dailyRow } = await supabase
    .from("dailies")
    .select("id")
    .eq("daily_date", localPlayDate)
    .eq("status", "live")
    .maybeSingle();

  if (!dailyRow) {
    const res = NextResponse.json({ error: "no_daily_live" }, { status: 404 });
    if (isNew) attachAnonymousCookie(res, anonymousKey);
    return res;
  }
  // Supabase's client infers column values as `unknown` from the select
  // string even without a Database type generic — cast once here rather
  // than repeating `as string` at every downstream use.
  const dailyId = dailyRow.id as string;

  const { data: totalRoundsRow } = await supabase
    .from("daily_rounds")
    .select("round_number")
    .eq("daily_id", dailyId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const totalRounds = (totalRoundsRow?.round_number as number) ?? 0;

  // Does this player already have an official attempt for THEIR local day?
  // Migration 0003 adds a unique (player_id, local_play_date) index, making
  // the once-per-local-calendar-day rule a database guarantee rather than
  // merely UI logic.
  const { data: existingAttempt } = await supabase
    .from("attempts")
    .select("id, status, daily_id")
    .eq("player_id", playerId)
    .eq("local_play_date", localPlayDate)
    .maybeSingle();

  let attemptId: string;

  if (existingAttempt) {
    if (existingAttempt.status === "completed") {
      const res = NextResponse.json({ error: "already_played", attemptId: existingAttempt.id }, { status: 409 });
      if (isNew) attachAnonymousCookie(res, anonymousKey);
      return res;
    }
    attemptId = existingAttempt.id as string;
  } else {
    const newAttemptId = randomUUID();
    const token = signAttemptToken({
      attemptId: newAttemptId,
      playerId,
      dailyId,
      exp: Date.now() + TOKEN_LIFETIME_MS,
    });

    const { error: insertError } = await supabase.from("attempts").insert({
      id: newAttemptId,
      player_id: playerId,
      daily_id: dailyId,
      attempt_token: token,
      status: "in_progress",
      local_play_date: localPlayDate,
      player_timezone: timeZone,
    });

    if (insertError) {
      // Most likely a race on the unique (player_id, daily_id) constraint —
      // two near-simultaneous start calls from the same player. Treat as
      // "someone already has this" rather than a hard failure.
      const res = NextResponse.json({ error: "attempt_already_exists" }, { status: 409 });
      if (isNew) attachAnonymousCookie(res, anonymousKey);
      return res;
    }

    attemptId = newAttemptId;
  }

  // Resume support: figure out which round comes next from what's already
  // been scored, rather than always starting at round 1.
  const { data: completedRounds } = await supabase
    .from("round_results")
    .select("round_number")
    .eq("attempt_id", attemptId);

  const nextRoundNumber = (completedRounds?.length ?? 0) + 1;

  if (nextRoundNumber > totalRounds) {
    const finalized = await finalizeAttempt(attemptId, dailyId, totalRounds);
    const res = NextResponse.json({
      status: "all_rounds_complete",
      attemptId,
      dailyId,
      localPlayDate,
      timeZone,
      totalRounds,
      roundsSurvived: finalized.roundsSurvived,
      eliminated: finalized.eliminated,
      estimatedPercentile: finalized.estimatedPercentile,
      currentStreak: finalized.currentStreak,
      longestStreak: finalized.longestStreak,
      freezesAvailable: finalized.freezesAvailable,
      freezeConsumed: finalized.freezeConsumed,
      freezeEarned: finalized.freezeEarned,
      totalPlayersToday: finalized.totalPlayersToday,
    });
    if (isNew) attachAnonymousCookie(res, anonymousKey);
    return res;
  }

  const { data: roundRow } = await supabase
    .from("daily_rounds")
    .select("round_number, difficulty_config, microgame_version_id")
    .eq("daily_id", dailyId)
    .eq("round_number", nextRoundNumber)
    .single();

  const { data: cutoffRow } = await supabase
    .from("cutoffs")
    .select("cutoff_value, target_survival_pct")
    .eq("daily_id", dailyId)
    .eq("round_number", nextRoundNumber)
    .single();

  const microgameVersionId = roundRow?.microgame_version_id as string | undefined;

  const { data: versionRow } = await supabase
    .from("microgame_versions")
    .select("microgame_id")
    .eq("id", microgameVersionId ?? "")
    .single();

  const microgameRowId = versionRow?.microgame_id as string | undefined;

  const { data: microgameRow } = await supabase
    .from("microgames")
    .select("slug")
    .eq("id", microgameRowId ?? "")
    .single();

  const token = signAttemptToken({
    attemptId,
    playerId,
    dailyId,
    exp: Date.now() + TOKEN_LIFETIME_MS,
  });

  const res = NextResponse.json({
    status: "ok",
    attemptToken: token,
    dailyId,
    localPlayDate,
    timeZone,
    totalRounds,
    round: {
      roundNumber: nextRoundNumber,
      microgameId: microgameRow?.slug,
      difficultyConfig: roundRow?.difficulty_config,
      cutoffValue: cutoffRow?.cutoff_value,
      targetSurvivalPct: cutoffRow?.target_survival_pct,
    },
  });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
