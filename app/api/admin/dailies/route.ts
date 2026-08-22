import { NextRequest,NextResponse } from "next/server";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

export async function GET(req:NextRequest){
 if(!(await requireAdmin(req)))return NextResponse.json({error:"unauthorized"},{status:401});
 const supabase=getSupabaseServerClient();
 const{data,error}=await supabase.from("dailies").select("id,daily_date,status,version,published_at,closed_at").order("daily_date",{ascending:false}).limit(14);
 return error?NextResponse.json({error:"read_failed",detail:error.message},{status:500}):NextResponse.json({status:"ok",dailies:data??[]});
}
