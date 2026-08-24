import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { verifyAttemptToken, signAttemptToken } from "@/lib/domain/attemptToken";
import { getScorer, getMetricDirection } from "@/lib/microgames/registry";
import { didSurvive } from "@/lib/domain/competition-engine/cutoffs";
import { finalizeAttempt } from "@/lib/domain/competition-engine/finalizeAttempt";
import type { MicrogameConfig, MicrogameInputEvent } from "@/lib/microgames/engine/types";

const TOKEN_LIFETIME_MS = 1000 * 60 * 60 * 2;

const eventSchema = z.object({
  type: z.string(),
  clientTimestamp: z.number(),
  data: z.record(z.union([z.number(), z.string()])).optional(),
});

const bodySchema = z.object({
  attemptToken: z.string(),
  roundNumber: z.number().int().positive(),
  // TRACE needs many sample points to score a drawn path accurately —
  // raised from an earlier 20 to comfortably fit that, still bounded so a
  // malformed or abusive payload can't balloon indefinitely.
  events: z.array(eventSchema).max(140),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const { attemptToken, roundNumber, events } = parsed.data;

  const payload = verifyAttemptToken(attemptToken);
  if (!payload) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 401 });
  }
  const { attemptId, playerId, dailyId } = payload;

  const supabase = getSupabaseServerClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("id, status, player_id, daily_id")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.player_id !== playerId || attempt.daily_id !== dailyId) {
    return NextResponse.json({ error: "attempt_not_found" }, { status: 404 });
  }
  if (attempt.status !== "in_progress") {
    return NextResponse.json({ error: "attempt_not_in_progress" }, { status: 409 });
  }

  // Reject a resubmission of a round already scored — the unique
  // (attempt_id, round_number) constraint on round_results is the real
  // enforcement; this check just gives a clean error instead of a raw
  // constraint violation.
  const { data: existingRound } = await supabase
    .from("round_results")
    .select("id")
    .eq("attempt_id", attemptId)
    .eq("round_number", roundNumber)
    .maybeSingle();
  if (existingRound) {
    return NextResponse.json({ error: "round_already_submitted" }, { status: 409 });
  }

  const { data: dailyRound } = await supabase
    .from("daily_rounds")
    .select("difficulty_config, microgame_version_id")
    .eq("daily_id", dailyId)
    .eq("round_number", roundNumber)
    .single();

  const { data: cutoffRow } = await supabase
    .from("cutoffs")
    .select("cutoff_value")
    .eq("daily_id", dailyId)
    .eq("round_number", roundNumber)
    .single();

  if (!dailyRound || !cutoffRow) {
    return NextResponse.json({ error: "round_not_found" }, { status: 404 });
  }

  const microgameVersionId = dailyRound.microgame_version_id as string;

  const { data: versionRow } = await supabase
    .from("microgame_versions")
    .select("microgame_id, version")
    .eq("id", microgameVersionId)
    .single();

  const microgameRowId = versionRow?.microgame_id as string | undefined;

  const { data: microgameRow } = await supabase
    .from("microgames")
    .select("slug")
    .eq("id", microgameRowId ?? "")
    .single();

  const microgameId = microgameRow?.slug as string | undefined;
  const scorer = microgameId ? getScorer(microgameId) : null;
  if (!microgameId || !scorer) {
    return NextResponse.json({ error: "unknown_microgame" }, { status: 500 });
  }

  const config: MicrogameConfig = {
    microgameId,
    version: (versionRow?.version as number) ?? 1,
    difficulty: (dailyRound.difficulty_config as Record<string, number>) ?? {},
    seed: 0,
  };
  const typedEvents: MicrogameInputEvent[] = events;

  const rawScore = scorer.computeScore(config, typedEvents);
  const plausible = scorer.isPlausible(config, typedEvents);
  const metricDirection = getMetricDirection(microgameId);
  const survived = plausible && didSurvive(rawScore, cutoffRow.cutoff_value as number, metricDirection);

  await supabase.from("round_results").insert({
    attempt_id: attemptId,
    round_number: roundNumber,
    raw_score: Number.isFinite(rawScore) ? rawScore : 999999,
    survived,
  });

  // Best-effort live counter — read-then-write, not atomic. Acceptable at
  // Phase C traffic levels; a proper atomic increment (Postgres function or
  // RPC) is a fine upgrade once real concurrent load exists, and never
  // affects survival either way since it's purely for the "X players
  // remain" display.
  const { data: countsRow } = await supabase
    .from("live_round_counts")
    .select("players_remaining, players_survived_so_far")
    .eq("daily_id", dailyId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  const currentPlayersRemaining = (countsRow?.players_remaining as number | undefined) ?? 0;
  const currentPlayersSurvived = (countsRow?.players_survived_so_far as number | undefined) ?? 0;

  await supabase.from("live_round_counts").upsert(
    {
      daily_id: dailyId,
      round_number: roundNumber,
      players_remaining: currentPlayersRemaining + 1,
      players_survived_so_far: currentPlayersSurvived + (survived ? 1 : 0),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "daily_id,round_number" }
  );

  const { data: totalRoundsRow } = await supabase
    .from("daily_rounds")
    .select("round_number")
    .eq("daily_id", dailyId)
    .order("round_number", { ascending: false })
    .limit(1)
    .single();
  const totalRounds = totalRoundsRow?.round_number as number;

  const isLastRound = roundNumber >= totalRounds;

  if (!survived || isLastRound) {
    const finalized = await finalizeAttempt(attemptId, dailyId, totalRounds);
    return NextResponse.json({
      status: "round_scored",
      survived,
      rawScore,
      cutoffValue: cutoffRow.cutoff_value,
      eliminated: !survived,
      completedAllRounds: survived && isLastRound,
      roundsSurvived: finalized.roundsSurvived,
      estimatedPercentile: finalized.estimatedPercentile,
      currentStreak: finalized.currentStreak,
      longestStreak: finalized.longestStreak,
      freezesAvailable: finalized.freezesAvailable,
      freezeConsumed: finalized.freezeConsumed,
      freezeEarned: finalized.freezeEarned,
      totalPlayersToday: finalized.totalPlayersToday,
    });
  }

  // Survived, more rounds remain — issue a fresh token and hand back the
  // next round's info (including its cutoff, revealed up front per the
  // "you know exactly what's required" design decision).
  const nextRoundNumber = roundNumber + 1;

  const { data: nextRound } = await supabase
    .from("daily_rounds")
    .select("difficulty_config, microgame_version_id")
    .eq("daily_id", dailyId)
    .eq("round_number", nextRoundNumber)
    .single();

  const { data: nextCutoff } = await supabase
    .from("cutoffs")
    .select("cutoff_value, target_survival_pct")
    .eq("daily_id", dailyId)
    .eq("round_number", nextRoundNumber)
    .single();

  const nextMicrogameVersionId = nextRound?.microgame_version_id as string | undefined;

  const { data: nextVersionRow } = await supabase
    .from("microgame_versions")
    .select("microgame_id")
    .eq("id", nextMicrogameVersionId ?? "")
    .single();

  const nextMicrogameRowId = nextVersionRow?.microgame_id as string | undefined;

  const { data: nextMicrogameRow } = await supabase
    .from("microgames")
    .select("slug")
    .eq("id", nextMicrogameRowId ?? "")
    .single();

  const nextToken = signAttemptToken({
    attemptId,
    playerId,
    dailyId,
    exp: Date.now() + TOKEN_LIFETIME_MS,
  });

  return NextResponse.json({
    status: "round_scored",
    survived: true,
    rawScore,
    cutoffValue: cutoffRow.cutoff_value,
    eliminated: false,
    completedAllRounds: false,
    attemptToken: nextToken,
    nextRound: {
      roundNumber: nextRoundNumber,
      microgameId: nextMicrogameRow?.slug,
      difficultyConfig: nextRound?.difficulty_config,
      cutoffValue: nextCutoff?.cutoff_value,
      targetSurvivalPct: nextCutoff?.target_survival_pct,
    },
  });
}
