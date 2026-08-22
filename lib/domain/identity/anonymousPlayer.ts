import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getRequestTimeZone } from "@/lib/domain/timezone/playerTimezone";

const COOKIE_NAME = "the_cut_anon_key";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years

// Get-or-create the anonymous player behind this request. The cookie stores
// only an opaque random key. We also remember the browser's IANA timezone
// (e.g. Europe/Dublin) so the Daily can reset at that player's local midnight.
// The current request remains authoritative for the current local date, so a
// player who genuinely travels is not stuck on the old timezone forever.
export async function getOrCreateAnonymousPlayer(
  req: NextRequest
): Promise<{ playerId: string; anonymousKey: string; isNew: boolean; timeZone: string }> {
  const supabase = getSupabaseServerClient();
  const existingKey = req.cookies.get(COOKIE_NAME)?.value;
  const timeZone = getRequestTimeZone(req);

  if (existingKey) {
    const { data, error } = await supabase
      .from("players")
      .select("id, timezone")
      .eq("anonymous_key", existingKey)
      .maybeSingle();

    if (!error && data) {
      if ((data.timezone as string | null) !== timeZone) {
        // Soft anti-abuse only: timezone changes are recorded server-side so
        // suspicious rapid switching can be reviewed later without invasive
        // device fingerprinting. The local-day unique constraint is still the
        // hard rule for an official attempt.
        await supabase
          .from("players")
          .update({ timezone: timeZone, timezone_updated_at: new Date().toISOString() })
          .eq("id", data.id as string);
      }
      return { playerId: data.id as string, anonymousKey: existingKey, isNew: false, timeZone };
    }
  }

  const anonymousKey = randomUUID();
  const { data, error } = await supabase
    .from("players")
    .insert({
      anonymous_key: anonymousKey,
      timezone: timeZone,
      timezone_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create anonymous player: " + (error?.message ?? "unknown error"));
  }

  return { playerId: data.id as string, anonymousKey, isNew: true, timeZone };
}

export function attachAnonymousCookie(response: NextResponse, anonymousKey: string) {
  response.cookies.set(COOKIE_NAME, anonymousKey, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
}
