import { NextRequest, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/domain/admin/auth";
import { runStreakReminders } from "@/lib/domain/push/streakReminders";

// For a manual test from the admin dashboard (real admin auth, not
// CRON_SECRET), see /api/admin/streak-reminders instead.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await runStreakReminders();
  return NextResponse.json({ status: "ok", ...result });
}
