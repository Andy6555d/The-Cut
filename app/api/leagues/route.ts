import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";
import { generateInviteCode } from "@/lib/domain/inviteCode";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export async function GET(req: NextRequest) {
  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  const { data: memberships } = await supabase.from("league_members").select("league_id").eq("player_id", playerId);
  const leagueIds = (memberships ?? []).map((m: any) => m.league_id as string);

  if (leagueIds.length === 0) {
    const res = NextResponse.json({ leagues: [] });
    if (isNew) attachAnonymousCookie(res, anonymousKey);
    return res;
  }

  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, invite_code, created_at")
    .in("id", leagueIds);

  // Member counts, one query rather than N — fetch all membership rows for
  // these leagues and tally client-side.
  const { data: allMembers } = await supabase.from("league_members").select("league_id").in("league_id", leagueIds);
  const countByLeague = new Map<string, number>();
  for (const m of allMembers ?? []) {
    const id = m.league_id as string;
    countByLeague.set(id, (countByLeague.get(id) ?? 0) + 1);
  }

  const result = (leagues ?? []).map((l: any) => ({
    id: l.id as string,
    name: l.name as string,
    inviteCode: l.invite_code as string,
    memberCount: countByLeague.get(l.id as string) ?? 0,
  }));

  const res = NextResponse.json({ leagues: result });
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const { playerId, anonymousKey, isNew } = await getOrCreateAnonymousPlayer(req);
  const supabase = getSupabaseServerClient();

  // Retry on the rare invite-code collision rather than trusting a single
  // random draw against the unique constraint.
  let league: { id: string; invite_code: string } | null = null;
  for (let attempt = 0; attempt < 5 && !league; attempt++) {
    const inviteCode = generateInviteCode();
    const { data, error } = await supabase
      .from("leagues")
      .insert({ name: parsed.data.name, invite_code: inviteCode, created_by: playerId })
      .select("id, invite_code")
      .single();
    if (!error && data) {
      league = { id: data.id as string, invite_code: data.invite_code as string };
    }
  }

  if (!league) {
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }

  await supabase.from("league_members").insert({ league_id: league.id, player_id: playerId });

  const res = NextResponse.json({ status: "ok", id: league.id, inviteCode: league.invite_code });
  if (isNew) attachAnonymousCookie(res, anonymousKey);
  return res;
}
