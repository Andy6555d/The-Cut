import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_subscription" }, { status: 400 });
  }

  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  // endpoint is unique — the same browser subscribing again (e.g. after
  // clearing permission and re-granting) just updates player_id/keys
  // rather than creating a duplicate row.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      player_id: playerId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: "save_failed", detail: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ status: "ok" });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
