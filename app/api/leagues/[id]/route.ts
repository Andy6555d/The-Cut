import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServerClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, invite_code")
    .eq("id", params.id)
    .maybeSingle();

  if (!league) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: memberRows } = await supabase.from("league_members").select("player_id").eq("league_id", params.id);

  return NextResponse.json({
    id: league.id as string,
    name: league.name as string,
    inviteCode: league.invite_code as string,
    memberCount: (memberRows ?? []).length,
  });
}
