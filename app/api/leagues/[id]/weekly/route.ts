import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { resolveHandles } from "@/lib/domain/leaderboardHandles";
import { currentWeekStart, getWeekEnd } from "@/lib/domain/weekBoundaries";

export const dynamic = "force-dynamic";

interface WeeklyEntry {
  playerId: string;
  handle: string;
  roundsSurvivedTotal: number;
  dailiesPlayed: number;
  rank: number;
}

// Computed live from attempts/daily_results each time — same pattern the
// single-Daily league leaderboard already uses, just summed across every
// closed Daily inside the current Monday-Sunday week rather than one day.
// This is what actually gives a league recurring stakes: standings reset
// to zero every Monday, so there's always a fresh race, not one leaderboard
// that only ever accumulates and eventually stops meaning anything.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const leagueId = params.id;
  const supabase = getSupabaseServerClient();

  const { data: memberRows } = await supabase.from("league_members").select("player_id").eq("league_id", leagueId);
  const memberPlayerIds = new Set((memberRows ?? []).map((m: any) => m.player_id as string));

  if (memberPlayerIds.size === 0) {
    return NextResponse.json({ status: "ok", weekStart: null, current: [], history: [] });
  }

  const weekStart = currentWeekStart();
  const weekEnd = getWeekEnd(weekStart);

  const { data: dailiesThisWeek } = await supabase
    .from("dailies")
    .select("id")
    .eq("status", "closed")
    .gte("daily_date", weekStart)
    .lte("daily_date", weekEnd);

  const dailyIds = (dailiesThisWeek ?? []).map((d: any) => d.id as string);

  let current: WeeklyEntry[] = [];
  if (dailyIds.length > 0) {
    const { data: attempts } = await supabase.from("attempts").select("id, player_id").in("daily_id", dailyIds);
    const playerIdByAttemptId = new Map<string, string>();
    for (const a of attempts ?? []) {
      const pid = (a as any).player_id as string;
      if (memberPlayerIds.has(pid)) playerIdByAttemptId.set((a as any).id as string, pid);
    }
    const attemptIds = Array.from(playerIdByAttemptId.keys());

    if (attemptIds.length > 0) {
      const { data: results } = await supabase
        .from("daily_results")
        .select("attempt_id, rounds_survived")
        .in("attempt_id", attemptIds)
        .eq("is_final", true);

      const totals = new Map<string, { roundsSurvivedTotal: number; dailiesPlayed: number }>();
      for (const r of results ?? []) {
        const playerId = playerIdByAttemptId.get((r as any).attempt_id as string);
        if (!playerId) continue;
        const existing = totals.get(playerId) ?? { roundsSurvivedTotal: 0, dailiesPlayed: 0 };
        existing.roundsSurvivedTotal += (r as any).rounds_survived as number;
        existing.dailiesPlayed += 1;
        totals.set(playerId, existing);
      }

      const handles = await resolveHandles(Array.from(totals.keys()));
      current = Array.from(totals.entries())
        .map(([playerId, t]) => ({
          playerId,
          handle: handles.get(playerId) ?? `Player #${playerId.slice(0, 6).toUpperCase()}`,
          roundsSurvivedTotal: t.roundsSurvivedTotal,
          dailiesPlayed: t.dailiesPlayed,
          rank: 0,
        }))
        .sort((a, b) => b.roundsSurvivedTotal - a.roundsSurvivedTotal)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));
    }
  }

  const { data: historyRows } = await supabase
    .from("league_weekly_results")
    .select("week_start_date, player_id, rounds_survived_total, dailies_played, rank")
    .eq("league_id", leagueId)
    .order("week_start_date", { ascending: false })
    .order("rank", { ascending: true })
    .limit(40); // a handful of recent weeks, a few members each

  const historyPlayerIds = Array.from(new Set((historyRows ?? []).map((r: any) => r.player_id as string)));
  const historyHandles = await resolveHandles(historyPlayerIds);

  const weekMap = new Map<string, WeeklyEntry[]>();
  for (const r of historyRows ?? []) {
    const week = (r as any).week_start_date as string;
    const playerId = (r as any).player_id as string;
    const entry: WeeklyEntry = {
      playerId,
      handle: historyHandles.get(playerId) ?? `Player #${playerId.slice(0, 6).toUpperCase()}`,
      roundsSurvivedTotal: (r as any).rounds_survived_total as number,
      dailiesPlayed: (r as any).dailies_played as number,
      rank: (r as any).rank as number,
    };
    const list = weekMap.get(week) ?? [];
    list.push(entry);
    weekMap.set(week, list);
  }
  const history = Array.from(weekMap.entries())
    .map(([week, entries]) => ({ weekStart: week, entries: entries.sort((a, b) => a.rank - b.rank) }))
    .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
    .slice(0, 4); // last 4 weeks of history is plenty for "did I win recently"

  return NextResponse.json({ status: "ok", weekStart, current, history });
}
