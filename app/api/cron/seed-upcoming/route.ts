import { NextRequest, NextResponse } from "next/server";
import { seedDailyForDate } from "@/lib/domain/daily-generation/seedDailyForDate";
import { cronAuthorized } from "@/lib/domain/admin/auth";

const DAYS_BEHIND = 1;
const DAYS_AHEAD = 3;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const today = new Date();
  const results = [];
  for (let offset = -DAYS_BEHIND; offset <= DAYS_AHEAD; offset++) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset));
    results.push(await seedDailyForDate(d.toISOString().slice(0, 10)));
  }
  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ status: allOk ? "ok" : "partial_failure", results }, { status: allOk ? 200 : 500 });
}
