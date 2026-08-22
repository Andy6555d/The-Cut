import { NextRequest,NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/domain/admin/auth";
import { seedDailyForDate } from "@/lib/domain/daily-generation/seedDailyForDate";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { worldwideCloseAtUtc } from "@/lib/domain/timezone/playerTimezone";
import { closeAndRankDaily } from "@/lib/domain/competition-engine/closeDaily";
import { calibratePractice } from "@/lib/domain/calibration/calibratePractice";

export async function GET(req:NextRequest){
 if(!cronAuthorized(req))return NextResponse.json({error:"unauthorized"},{status:401});
 const now=new Date();const seeded=[];for(let offset=-1;offset<=3;offset++){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+offset));seeded.push(await seedDailyForDate(d.toISOString().slice(0,10)));}
 const supabase=getSupabaseServerClient();const{data:live}=await supabase.from("dailies").select("id,daily_date").eq("status","live").order("daily_date");const closed=[];for(const d of live??[]){if(Date.now()>=worldwideCloseAtUtc(String(d.daily_date)).getTime())closed.push({dailyDate:d.daily_date,...await closeAndRankDaily(String(d.id))});}
 let calibration:Record<string,unknown>;try{calibration=await calibratePractice()}catch(e){calibration={error:e instanceof Error?e.message:"unknown"}};
 return NextResponse.json({status:"ok",seeded,closed,calibration});
}
