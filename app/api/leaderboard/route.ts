import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { resolveHandles } from "@/lib/domain/leaderboardHandles";

const LEADERBOARD_SIZE = 20;

// This route reads request search params (?date=), which Next.js
// recognizes as dynamic — it won't be statically cached the way
// /api/daily was before that fix. No force-dynamic needed, but harmless
// to be explicit given we've been bitten by this exact class of bug once
// already.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const requestedDate = req.nextUrl.searchParams.get("date");

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

  // daily_results has no daily_id column of its own — it's reached only
  // via attempt_id. So: find this Daily's attempts FIRST, then ask for
  // ranked results restricted to exactly those attempt ids. Querying
  // daily_results by is_final alone (without this) would silently mix
  // rankings from every closed Daily together, since world_rank is only
  // meaningful within a single Daily.
  const { data: attempts } = await supabase.from("attempts").select("id, player_id").eq("daily_id", dailyId);

  const playerIdByAttemptId = new Map<string, string>();
  for (const a of attempts ?? []) {
    playerIdByAttemptId.set(a.id as string, a.player_id as string);
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
    .order("world_rank", { ascending: true })
    .limit(LEADERBOARD_SIZE);

  const rows = results ?? [];
  const handles = await resolveHandles(Array.from(new Set(playerIdByAttemptId.values())));

  const entries = rows
    .filter((r: any) => playerIdByAttemptId.has(r.attempt_id as string))
    .map((r: any) => {
      const playerId = playerIdByAttemptId.get(r.attempt_id as string) as string;
      return {
        worldRank: r.world_rank as number,
        roundsSurvived: r.rounds_survived as number,
        finalPercentile: r.final_percentile as number,
        handle: handles.get(playerId) ?? `Player #${playerId.slice(0, 6).toUpperCase()}`,
      };
    });

  return NextResponse.json({ status: "ok", dailyDate, entries });
}
