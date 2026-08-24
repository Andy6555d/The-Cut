import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, freezes_available")
    .eq("player_id", playerId)
    .maybeSingle();

  const res = NextResponse.json({
    currentStreak: (data?.current_streak as number | undefined) ?? 0,
    longestStreak: (data?.longest_streak as number | undefined) ?? 0,
    freezesAvailable: (data?.freezes_available as number | undefined) ?? 0,
  });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
