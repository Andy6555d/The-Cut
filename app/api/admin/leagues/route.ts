import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

type LeagueRow = {
  id: string;
  name: string | null;
  invite_code: string | null;
  created_by: string | null;
  created_at: string | null;
};

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const s = getSupabaseServerClient();
  const { data, error } = await s
    .from("leagues")
    .select("id,name,invite_code,created_by,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const leagues = (data ?? []) as LeagueRow[];
  const out: Array<LeagueRow & { memberCount: number }> = [];

  for (const league of leagues) {
    const { count } = await s
      .from("league_members")
      .select("player_id", { count: "exact", head: true })
      .eq("league_id", String(league.id));

    out.push({ ...league, memberCount: count ?? 0 });
  }

  return NextResponse.json({ status: "ok", leagues: out });
}
