import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

const PERFORMANCE = new Set(["memory-grid", "count", "dont-tap", "trace"]);

export async function GET(req: NextRequest) {
  const player = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { data: games } = await supabase.from("microgames").select("id, slug");
  const slugById = new Map<string, string>();
  for (const game of games ?? []) slugById.set(String(game.id), String(game.slug));

  const { data, error } = await supabase
    .from("practice_attempts")
    .select("id, microgame_id, raw_score, performance_score, failed, played_at")
    .eq("player_id", player.playerId)
    .eq("failed", false)
    .order("played_at", { ascending: true })
    .limit(2000);

  if (error) return NextResponse.json({ error: "read_failed" }, { status: 500 });

  const grouped: Record<string, number[]> = {};
  for (const row of data ?? []) {
    const slug = slugById.get(String(row.microgame_id));
    if (!slug) continue;
    const key = PERFORMANCE.has(slug) ? `${slug}-performance` : slug;
    const value = PERFORMANCE.has(slug) ? Number(row.performance_score) : Number(row.raw_score);
    if (!Number.isFinite(value)) continue;
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push(value);
    if (grouped[key]!.length > 200) grouped[key] = grouped[key]!.slice(-200);
  }

  const res = NextResponse.json({ status: "ok", scores: grouped });
  if (player.isNew) attachAnonymousCookie(res, player.anonymousKey);
  return res;
}
