import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { computeFinalRanking, type FinalRankingInput } from "./finalRanking";
import { getMetricDirection } from "@/lib/microgames/registry";

export async function closeAndRankDaily(dailyId: string): Promise<{ status: string; rankedAttempts: number }> {
  const supabase = getSupabaseServerClient();
  const { data: daily } = await supabase.from("dailies").select("status").eq("id", dailyId).single();
  if (!daily) throw new Error("daily_not_found");
  if (daily.status === "closed") return { status: "already_closed", rankedAttempts: 0 };

  const { data: attempts } = await supabase
    .from("attempts")
    .select("id")
    .eq("daily_id", dailyId)
    .eq("status", "completed");
  const attemptIds = (attempts ?? []).map((a: any) => a.id as string);

  if (attemptIds.length === 0) {
    await supabase.from("dailies").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", dailyId);
    return { status: "closed_no_attempts", rankedAttempts: 0 };
  }

  const { data: totalRoundsRow } = await supabase
    .from("daily_rounds")
    .select("round_number")
    .eq("daily_id", dailyId)
    .order("round_number", { ascending: false })
    .limit(1)
    .single();
  const totalRounds = Number(totalRoundsRow?.round_number ?? 0);

  const { data: rounds } = await supabase
    .from("daily_rounds")
    .select("round_number, microgame_version_id")
    .eq("daily_id", dailyId);
  const versionIds = [...new Set((rounds ?? []).map((r: any) => r.microgame_version_id as string))];
  const { data: versions } = versionIds.length
    ? await supabase.from("microgame_versions").select("id, microgame_id").in("id", versionIds)
    : { data: [] as any[] };
  const microgameIds = [...new Set((versions ?? []).map((v: any) => v.microgame_id as string))];
  const { data: games } = microgameIds.length
    ? await supabase.from("microgames").select("id, slug").in("id", microgameIds)
    : { data: [] as any[] };
  const slugByGame = new Map((games ?? []).map((g: any) => [g.id as string, g.slug as string]));
  const gameByVersion = new Map((versions ?? []).map((v: any) => [v.id as string, slugByGame.get(v.microgame_id as string) ?? "stop"]));
  const versionByRound = new Map((rounds ?? []).map((r: any) => [Number(r.round_number), r.microgame_version_id as string]));

  const rankingInputs: FinalRankingInput[] = [];
  for (const attemptId of attemptIds) {
    const { data: dailyResult } = await supabase.from("daily_results").select("rounds_survived").eq("attempt_id", attemptId).maybeSingle();
    const roundsSurvived = Number(dailyResult?.rounds_survived ?? 0);
    const finalRoundNumber = Math.min(roundsSurvived + 1, totalRounds);
    const { data: finalRoundResult } = await supabase
      .from("round_results")
      .select("raw_score")
      .eq("attempt_id", attemptId)
      .eq("round_number", finalRoundNumber)
      .maybeSingle();
    const versionId = versionByRound.get(finalRoundNumber);
    const slug = String(versionId ? gameByVersion.get(versionId) ?? "stop" : "stop");
    rankingInputs.push({
      attemptId,
      roundsSurvived,
      finalRoundRawScore: finalRoundResult?.raw_score == null ? null : Number(finalRoundResult.raw_score),
      finalRoundMetricDirection: getMetricDirection(slug),
    });
  }

  const rankings = computeFinalRanking(rankingInputs);
  for (const ranking of rankings) {
    await supabase.from("daily_results").update({
      final_percentile: ranking.finalPercentile,
      world_rank: ranking.worldRank,
      is_final: true,
    }).eq("attempt_id", ranking.attemptId);
  }

  await supabase.from("dailies").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", dailyId);
  return { status: "closed_and_ranked", rankedAttempts: rankings.length };
}
