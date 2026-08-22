import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getLocalPlayDate } from "@/lib/domain/timezone/playerTimezone";

export const dynamic = "force-dynamic";

// GET /api/daily — resolves "today" in the PLAYER'S timezone. Multiple
// calendar-date Dailies may be live globally at once; the player's local
// date selects the one they are eligible to play.
export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  const { timeZone, localDate } = getLocalPlayDate(req);

  const { data, error } = await supabase
    .from("dailies")
    .select("id, daily_date, status")
    .eq("daily_date", localDate)
    .eq("status", "live")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { status: "no_daily_live", localDate, timeZone, resetMode: "local_midnight" },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { ...data, localDate, timeZone, resetMode: "local_midnight" },
    { status: 200 }
  );
}
