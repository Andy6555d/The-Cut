import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { verifyAttemptToken } from "@/lib/domain/attemptToken";
import { finalizeAttempt } from "@/lib/domain/competition-engine/finalizeAttempt";

const bodySchema = z.object({ attemptToken: z.string() });

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

  const payload = verifyAttemptToken(parsed.data.attemptToken);
  if (!payload) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 401 });
  }
  const { attemptId, dailyId } = payload;

  const supabase = getSupabaseServerClient();
  const { data: totalRoundsRow } = await supabase
    .from("daily_rounds")
    .select("round_number")
    .eq("daily_id", dailyId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const totalRounds = (totalRoundsRow?.round_number as number | undefined) ?? 0;

  const result = await finalizeAttempt(attemptId, dailyId, totalRounds);

  return NextResponse.json({
    status: "finalized",
    roundsSurvived: result.roundsSurvived,
    eliminated: result.eliminated,
    estimatedPercentile: result.estimatedPercentile,
    currentStreak: result.currentStreak,
    longestStreak: result.longestStreak,
    freezesAvailable: result.freezesAvailable,
    freezeConsumed: result.freezeConsumed,
    freezeEarned: result.freezeEarned,
    totalPlayersToday: result.totalPlayersToday,
  });
}
