import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(30).refine((v: string) => !/[\u0000-\u001F\u007F]/.test(v), "no control characters"),
});

export async function GET(req: NextRequest) {
  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { data } = await supabase.from("players").select("display_name").eq("id", playerId).maybeSingle();

  const res = NextResponse.json({ displayName: (data?.display_name as string | null | undefined) ?? null });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_display_name" }, { status: 400 });
  }

  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { error } = await supabase
    .from("players")
    .update({ display_name: parsed.data.displayName })
    .eq("id", playerId);

  if (error) {
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ status: "ok", displayName: parsed.data.displayName });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
