import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/domain/admin/auth";
import { runLeagueWeeklySnapshot } from "@/lib/domain/competition-engine/leagueWeeklySnapshot";

// Uses the same CRON_SECRET + Authorization: Bearer convention as
// /api/cron/maintenance — Vercel sends that header automatically for
// scheduled cron invocations, so nothing needs to be embedded in the
// committed vercel.json path. For a manual trigger from the admin
// dashboard (a real logged-in admin, not Vercel's scheduler), see
// /api/admin/league-weekly-snapshot instead — same underlying logic,
// different auth check, since an admin session token isn't CRON_SECRET.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runLeagueWeeklySnapshot();
  return NextResponse.json({ status: "ok", ...result });
}
