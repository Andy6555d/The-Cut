import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ endpoint: z.string().url() });

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);

  return NextResponse.json({ status: "ok" });
}
