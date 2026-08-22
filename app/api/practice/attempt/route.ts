import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

const schema=z.object({
  microgameId:z.enum(["react","stop","exact","centre","half","bigger","memory-grid","count","dont-tap","trace"]),
  practiceLevel:z.number().int().min(1).max(10),
  rawScore:z.number().finite().nullable(),
  performanceScore:z.number().finite().nullable().optional(),
  failed:z.boolean(),
  durationMs:z.number().int().min(0).max(120000).nullable().optional(),
});

export async function POST(req:NextRequest){
  const body=await req.json().catch(()=>null); const parsed=schema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"invalid_payload"},{status:400});
  const {playerId,anonymousKey,isNew}=await getOrCreateAnonymousPlayer(req); const supabase=getSupabaseServerClient();
  const {data:game}=await supabase.from("microgames").select("id").eq("slug",parsed.data.microgameId).maybeSingle();
  if(!game)return NextResponse.json({error:"microgame_not_found"},{status:404});
  const {data:version}=await supabase.from("microgame_versions").select("id").eq("microgame_id",String(game.id)).eq("version",1).maybeSingle();
  const {error}=await supabase.from("practice_attempts").insert({
    player_id:playerId,microgame_id:String(game.id),microgame_version_id:version?.id ? String(version.id) : null,practice_level:parsed.data.practiceLevel,
    raw_score:parsed.data.rawScore,performance_score:parsed.data.performanceScore??null,failed:parsed.data.failed,duration_ms:parsed.data.durationMs??null,
  });
  if(error)return NextResponse.json({error:"insert_failed",detail:error.message},{status:500});
  const res=NextResponse.json({status:"ok"});if(isNew)attachAnonymousCookie(res,anonymousKey);return res;
}
