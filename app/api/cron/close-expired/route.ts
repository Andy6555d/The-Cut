import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/domain/admin/auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { worldwideCloseAtUtc } from "@/lib/domain/timezone/playerTimezone";
import { closeAndRankDaily } from "@/lib/domain/competition-engine/closeDaily";

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const { data: live } = await supabase.from("dailies").select("id, daily_date").eq("status", "live").order("daily_date", { ascending: true });
  const now = Date.now();
  const results: Array<Record<string, unknown>> = [];
  for (const daily of live ?? []) {
    const date = String(daily.daily_date);
    if (now < worldwideCloseAtUtc(date).getTime()) continue;
    try {
      const closed = await closeAndRankDaily(String(daily.id));
      results.push({ dailyDate: date, ...closed });
    } catch (error) {
      results.push({ dailyDate: date, status: "error", detail: error instanceof Error ? error.message : "unknown" });
    }
  }
  return NextResponse.json({ status: "ok", processed: results.length, results });
}
