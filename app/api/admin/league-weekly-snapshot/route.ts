import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { runLeagueWeeklySnapshot } from "@/lib/domain/competition-engine/leagueWeeklySnapshot";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await runLeagueWeeklySnapshot();
  return NextResponse.json({ status: "ok", ...result });
}
