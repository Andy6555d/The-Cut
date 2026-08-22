import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getOrCreateAnonymousPlayer, attachAnonymousCookie } from "@/lib/domain/identity/anonymousPlayer";

export async function POST(req:NextRequest){
  const token=(req.headers.get("authorization")??"").replace(/^Bearer\s+/i,"");
  if(!token)return NextResponse.json({error:"unauthorized"},{status:401});
  const supabase=getSupabaseServerClient(); const {data:auth,error:authError}=await supabase.auth.getUser(token);
  if(authError||!auth.user)return NextResponse.json({error:"unauthorized"},{status:401});
  const current=await getOrCreateAnonymousPlayer(req);
  const {data:currentPlayer}=await supabase.from("players").select("id,display_name").eq("id",current.playerId).single();

  let {data:account}=await supabase.from("accounts").select("id").eq("auth_user_id",auth.user.id).maybeSingle();
  if(!account){const ins=await supabase.from("accounts").insert({auth_user_id:auth.user.id,display_name:currentPlayer?.display_name??null}).select("id").single();if(ins.error||!ins.data)return NextResponse.json({error:"account_create_failed",detail:ins.error?.message},{status:500});account=ins.data;}
  const accountId=String(account.id);
  const {data:canonical}=await supabase.from("players").select("id,anonymous_key,display_name").eq("account_id",accountId).order("created_at",{ascending:true}).limit(1).maybeSingle();

  let canonicalKey=current.anonymousKey; let canonicalId=current.playerId;
  if(canonical&&String(canonical.id)!==current.playerId){
    canonicalId=String(canonical.id); canonicalKey=String(canonical.anonymous_key);
    // Merge the safe social/training state. Official historical attempts stay
    // attached to their original player rows to avoid uniqueness conflicts.
    await supabase.from("practice_attempts").update({player_id:canonicalId}).eq("player_id",current.playerId);
    const {data:memberships}=await supabase.from("league_members").select("league_id").eq("player_id",current.playerId);
    for(const m of memberships??[])await supabase.from("league_members").upsert({league_id:m.league_id,player_id:canonicalId},{onConflict:"league_id,player_id"});
    if(!canonical.display_name&&currentPlayer?.display_name)await supabase.from("players").update({display_name:currentPlayer.display_name}).eq("id",canonicalId);
  } else {
    await supabase.from("players").update({account_id:accountId}).eq("id",current.playerId);
  }

  const res=NextResponse.json({status:"ok",playerId:canonicalId,email:auth.user.email??null}); attachAnonymousCookie(res,canonicalKey); return res;
}
