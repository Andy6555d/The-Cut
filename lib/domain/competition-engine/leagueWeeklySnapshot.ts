import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { previousWeekStart, getWeekEnd } from "@/lib/domain/weekBoundaries";

export interface LeagueWeeklySnapshotResult {
  weekStart: string;
  results: Record<string, string>;
}

// Snapshots the just-finished week's standings into league_weekly_results
// for every league. Idempotent per league (upsert), so re-running for a
// week already snapshotted just overwrites with the same numbers.
export async function runLeagueWeeklySnapshot(): Promise<LeagueWeeklySnapshotResult> {
  const supabase = getSupabaseServerClient();
  const weekStart = previousWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  const { data: leagues } = await supabase.from("leagues").select("id");
  const results: Record<string, string> = {};

  for (const league of leagues ?? []) {
    const leagueId = (league as any).id as string;

    const { data: memberRows } = await supabase.from("league_members").select("player_id").eq("league_id", leagueId);
    const memberPlayerIds = new Set((memberRows ?? []).map((m: any) => m.player_id as string));
    if (memberPlayerIds.size === 0) {
      results[leagueId] = "no_members";
      continue;
    }

    const { data: dailiesThatWeek } = await supabase
      .from("dailies")
      .select("id")
      .eq("status", "closed")
      .gte("daily_date", weekStart)
      .lte("daily_date", weekEnd);
    const dailyIds = (dailiesThatWeek ?? []).map((d: any) => d.id as string);

    if (dailyIds.length === 0) {
      results[leagueId] = "no_dailies_that_week";
      continue;
    }

    const { data: attempts } = await supabase.from("attempts").select("id, player_id").in("daily_id", dailyIds);
    const playerIdByAttemptId = new Map<string, string>();
    for (const a of attempts ?? []) {
      const pid = (a as any).player_id as string;
      if (memberPlayerIds.has(pid)) playerIdByAttemptId.set((a as any).id as string, pid);
    }
    const attemptIds = Array.from(playerIdByAttemptId.keys());
    if (attemptIds.length === 0) {
      results[leagueId] = "no_member_attempts";
      continue;
    }

    const { data: dailyResults } = await supabase
      .from("daily_results")
      .select("attempt_id, rounds_survived")
      .in("attempt_id", attemptIds)
      .eq("is_final", true);

    const totals = new Map<string, { roundsSurvivedTotal: number; dailiesPlayed: number }>();
    for (const r of dailyResults ?? []) {
      const playerId = playerIdByAttemptId.get((r as any).attempt_id as string);
      if (!playerId) continue;
      const existing = totals.get(playerId) ?? { roundsSurvivedTotal: 0, dailiesPlayed: 0 };
      existing.roundsSurvivedTotal += (r as any).rounds_survived as number;
      existing.dailiesPlayed += 1;
      totals.set(playerId, existing);
    }

    const ranked = Array.from(totals.entries())
      .sort((a, b) => b[1].roundsSurvivedTotal - a[1].roundsSurvivedTotal)
      .map(([playerId, t], index) => ({ playerId, ...t, rank: index + 1 }));

    for (const entry of ranked) {
      await supabase.from("league_weekly_results").upsert(
        {
          league_id: leagueId,
          week_start_date: weekStart,
          player_id: entry.playerId,
          rounds_survived_total: entry.roundsSurvivedTotal,
          dailies_played: entry.dailiesPlayed,
          rank: entry.rank,
        },
        { onConflict: "league_id,week_start_date,player_id" }
      );
    }

    results[leagueId] = `snapshotted_${ranked.length}_members`;
  }

  return { weekStart, results };
}
