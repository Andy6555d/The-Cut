import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { estimatePercentile, type RoundTarget } from "@/lib/domain/competition-engine/percentile";
import { computeStreakUpdate, type StreakState } from "@/lib/domain/streaks";

export interface FinalizeResult {
  roundsSurvived: number;
  eliminated: boolean;
  estimatedPercentile: number | null;
  currentStreak: number;
  longestStreak: number;
  freezesAvailable: number;
  freezeConsumed: boolean;
  freezeEarned: boolean;
  totalPlayersToday: number | null;
}

async function getStreakState(playerId: string): Promise<{ existing: StreakState }> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_played_date, freezes_available")
    .eq("player_id", playerId)
    .maybeSingle();

  return {
    existing: {
      currentStreak: (data?.current_streak as number | undefined) ?? 0,
      longestStreak: (data?.longest_streak as number | undefined) ?? 0,
      lastPlayedDate: (data?.last_played_date as string | undefined) ?? null,
      freezesAvailable: (data?.freezes_available as number | undefined) ?? 0,
    },
  };
}

async function getTotalPlayersToday(dailyId: string): Promise<number | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("live_round_counts")
    .select("players_remaining")
    .eq("daily_id", dailyId)
    .eq("round_number", 1)
    .maybeSingle();
  return (data?.players_remaining as number | undefined) ?? null;
}

// Idempotent: if the attempt is already completed, returns the existing
// daily_results row without recomputing anything, and the player's
// CURRENT streak state without updating it again. Safe to call from both
// the elimination/last-round path inside /api/attempt/round AND from a
// standalone /api/attempt/finish call, per ARCHITECTURE.md's attempt
// lifecycle note that finish can be "auto-triggered on elimination / final
// round."
export async function finalizeAttempt(
  attemptId: string,
  dailyId: string,
  totalRounds: number
): Promise<FinalizeResult> {
  const supabase = getSupabaseServerClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("status, player_id")
    .eq("id", attemptId)
    .single();

  const playerId = attempt?.player_id as string | undefined;
  const totalPlayersToday = await getTotalPlayersToday(dailyId);

  if (attempt?.status === "completed") {
    const { data: existing } = await supabase
      .from("daily_results")
      .select("rounds_survived, estimated_percentile")
      .eq("attempt_id", attemptId)
      .maybeSingle();

    // Supabase's client infers column values as `unknown` from the select
    // string even without a Database type generic — cast explicitly rather
    // than letting `??`/comparisons operate on `unknown` (TS rejects `<`
    // on `unknown` outright, and would reject the return-object assignment
    // against FinalizeResult's typed fields too).
    const existingRoundsSurvived = (existing?.rounds_survived as number | undefined) ?? 0;
    const existingEstimatedPercentile = (existing?.estimated_percentile as number | null | undefined) ?? null;

    const streakState = playerId ? (await getStreakState(playerId)).existing : null;

    return {
      roundsSurvived: existingRoundsSurvived,
      eliminated: existingRoundsSurvived < totalRounds,
      estimatedPercentile: existingEstimatedPercentile,
      currentStreak: streakState?.currentStreak ?? 0,
      longestStreak: streakState?.longestStreak ?? 0,
      freezesAvailable: streakState?.freezesAvailable ?? 0,
      freezeConsumed: false,
      freezeEarned: false,
      totalPlayersToday,
    };
  }

  const { data: roundResults } = await supabase
    .from("round_results")
    .select("round_number, survived")
    .eq("attempt_id", attemptId)
    .order("round_number", { ascending: true });

  const results = roundResults ?? [];
  const roundsSurvived = results.filter((r: any) => r.survived).length;
  const eliminated = roundsSurvived < totalRounds;

  const { data: cutoffRows } = await supabase
    .from("cutoffs")
    .select("round_number, target_survival_pct")
    .eq("daily_id", dailyId);

  const roundTargets: RoundTarget[] = (cutoffRows ?? []).map((c: any) => ({
    roundNumber: c.round_number as number,
    targetSurvivalPct: c.target_survival_pct as number,
  }));

  const estimatedPercentile = estimatePercentile(roundsSurvived, roundTargets, eliminated);

  await supabase
    .from("attempts")
    .update({ status: "completed", finished_at: new Date().toISOString() })
    .eq("id", attemptId);

  await supabase.from("daily_results").upsert(
    {
      attempt_id: attemptId,
      rounds_survived: roundsSurvived,
      estimated_percentile: estimatedPercentile,
      is_final: false,
    },
    { onConflict: "attempt_id" }
  );

  // Streak update — keyed off the DAILY's own date, not server wall-clock
  // time, so finishing right at the date boundary always attributes
  // correctly. Only happens on the actual completion path, never on the
  // idempotent re-check above.
  let currentStreak = 0;
  let longestStreak = 0;
  let freezesAvailable = 0;
  let freezeConsumed = false;
  let freezeEarned = false;

  if (playerId) {
    const { data: dailyRow } = await supabase.from("dailies").select("daily_date").eq("id", dailyId).single();
    const dailyDate = (dailyRow?.daily_date as string | undefined) ?? new Date().toISOString().slice(0, 10);

    const { existing } = await getStreakState(playerId);
    const updated = computeStreakUpdate(existing, dailyDate);
    currentStreak = updated.currentStreak;
    longestStreak = updated.longestStreak;
    freezesAvailable = updated.freezesAvailable;
    freezeConsumed = updated.freezeConsumed;
    freezeEarned = updated.freezeEarned;

    await supabase.from("streaks").upsert(
      {
        player_id: playerId,
        current_streak: updated.currentStreak,
        longest_streak: updated.longestStreak,
        last_played_date: updated.lastPlayedDate,
        freezes_available: updated.freezesAvailable,
      },
      { onConflict: "player_id" }
    );
  }

  return {
    roundsSurvived,
    eliminated,
    estimatedPercentile,
    currentStreak,
    longestStreak,
    freezesAvailable,
    freezeConsumed,
    freezeEarned,
    totalPlayersToday,
  };
}
