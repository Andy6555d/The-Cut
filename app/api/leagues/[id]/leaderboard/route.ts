import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { resolveHandles } from "@/lib/domain/leaderboardHandles";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const leagueId = params.id;
  const supabase = getSupabaseServerClient();
  const requestedDate = req.nextUrl.searchParams.get("date");

  const { data: memberRows } = await supabase.from("league_members").select("player_id").eq("league_id", leagueId);
  const memberPlayerIds = new Set((memberRows ?? []).map((m: any) => m.player_id as string));

  if (memberPlayerIds.size === 0) {
    return NextResponse.json({ status: "ok", dailyDate: null, entries: [] });
  }

  let dailyId: string;
  let dailyDate: string;

  if (requestedDate) {
    const { data } = await supabase
      .from("dailies")
      .select("id, daily_date")
      .eq("daily_date", requestedDate)
      .eq("status", "closed")
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ status: "no_closed_daily_for_date", date: requestedDate });
    }
    dailyId = data.id as string;
    dailyDate = data.daily_date as string;
  } else {
    const { data } = await supabase
      .from("dailies")
      .select("id, daily_date")
      .eq("status", "closed")
      .order("daily_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ status: "no_closed_daily_yet" });
    }
    dailyId = data.id as string;
    dailyDate = data.daily_date as string;
  }

  const { data: attempts } = await supabase.from("attempts").select("id, player_id").eq("daily_id", dailyId);

  const playerIdByAttemptId = new Map<string, string>();
  for (const a of attempts ?? []) {
    const pid = a.player_id as string;
    if (memberPlayerIds.has(pid)) {
      playerIdByAttemptId.set(a.id as string, pid);
    }
  }

  const attemptIds = Array.from(playerIdByAttemptId.keys());
  if (attemptIds.length === 0) {
    return NextResponse.json({ status: "ok", dailyDate, entries: [] });
  }

  const { data: results } = await supabase
    .from("daily_results")
    .select("attempt_id, rounds_survived, final_percentile, world_rank")
    .in("attempt_id", attemptIds)
    .eq("is_final", true)
    .order("world_rank", { ascending: true });

  type LeagueLeaderboardEntry = { worldRank: number; roundsSurvived: number; finalPercentile: number; handle: string };
  const rows = results ?? [];
  const handles = await resolveHandles(Array.from(new Set(playerIdByAttemptId.values())));

  const entries: Array<LeagueLeaderboardEntry & { leagueRank: number }> = rows
    .filter((r: any) => playerIdByAttemptId.has(r.attempt_id as string))
    .map((r: any) => {
      const playerId = playerIdByAttemptId.get(r.attempt_id as string) as string;
      return {
        worldRank: r.world_rank as number, // this is the player's WORLDWIDE rank, kept for context
        roundsSurvived: r.rounds_survived as number,
        finalPercentile: r.final_percentile as number,
        handle: handles.get(playerId) ?? `Player #${playerId.slice(0, 6).toUpperCase()}`,
      };
    })
    // Re-ranked within the league by the same ordering rule (rounds
    // survived, then the same percentile ordering) rather than reusing
    // world_rank as the league position.
    .sort((a: LeagueLeaderboardEntry, b: LeagueLeaderboardEntry) => b.roundsSurvived - a.roundsSurvived || b.finalPercentile - a.finalPercentile)
    .map((entry: LeagueLeaderboardEntry, index: number) => ({ ...entry, leagueRank: index + 1 }));

  return NextResponse.json({ status: "ok", dailyDate, entries });
}
