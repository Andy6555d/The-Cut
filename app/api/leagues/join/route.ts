import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  inviteCode: z.string().trim().toUpperCase().min(4).max(12),
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
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("invite_code", parsed.data.inviteCode)
    .maybeSingle();

  if (!league) {
    return NextResponse.json({ error: "league_not_found" }, { status: 404 });
  }
  const leagueId = league.id as string;

  const { data: existing } = await supabase
    .from("league_members")
    .select("league_id")
    .eq("league_id", leagueId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("league_members").insert({ league_id: leagueId, player_id: playerId });
  }

  const res = NextResponse.json({ status: "ok", id: leagueId, name: league.name as string });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
