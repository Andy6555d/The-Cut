import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { runStreakReminders } from "@/lib/domain/push/streakReminders";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await runStreakReminders({ ignoreHourWindow: true });
  return NextResponse.json({ status: "ok", ...result });
}
