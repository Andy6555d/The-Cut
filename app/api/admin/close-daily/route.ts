import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { worldwideCloseAtUtc } from "@/lib/domain/timezone/playerTimezone";
import { closeAndRankDaily } from "@/lib/domain/competition-engine/closeDaily";
import { requireAdmin } from "@/lib/domain/admin/auth";

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const body = await req.json().catch(() => ({}));
  const dailyDate = typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10);
  const force = body.force === true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dailyDate)) return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  if (!force && Date.now() < worldwideCloseAtUtc(dailyDate).getTime()) return NextResponse.json({ error: "daily_still_open_somewhere" }, { status: 409 });
  const { data: daily } = await supabase.from("dailies").select("id").eq("daily_date", dailyDate).maybeSingle();
  if (!daily) return NextResponse.json({ error: "daily_not_found" }, { status: 404 });
  return NextResponse.json({ dailyDate, ...(await closeAndRankDaily(String(daily.id))) });
}
