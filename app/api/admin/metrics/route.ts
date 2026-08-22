import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/domain/admin/auth";
import { getSupabaseServerClient } from "@/lib/db/supabase-server";

function startOfUtcDay(date = new Date()) { const d=new Date(date); d.setUTCHours(0,0,0,0); return d; }
function plusDays(d:Date,n:number){ return new Date(d.getTime()+n*86400000); }

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = getSupabaseServerClient();
  const today = startOfUtcDay(); const tomorrow=plusDays(today,1);

  const [newPlayersQ, attemptsQ, completedQ, practiceQ, eventQ] = await Promise.all([
    supabase.from("players").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()).lt("created_at", tomorrow.toISOString()),
    supabase.from("attempts").select("id", { count: "exact", head: true }).gte("started_at", today.toISOString()).lt("started_at", tomorrow.toISOString()),
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("status", "completed").gte("finished_at", today.toISOString()).lt("finished_at", tomorrow.toISOString()),
    supabase.from("practice_attempts").select("id", { count: "exact", head: true }).gte("played_at", today.toISOString()).lt("played_at", tomorrow.toISOString()),
    supabase.from("analytics_events").select("event_name,player_id,occurred_at").gte("occurred_at", today.toISOString()).lt("occurred_at", tomorrow.toISOString()).limit(20000),
  ]);
  type AnalyticsEventRow = { event_name: string | null; player_id: string | null; occurred_at: string | null };
  type IdRow = { id: string };
  type ReturnRow = { player_id: string | null };
  const events = (eventQ.data ?? []) as AnalyticsEventRow[];
  const activePlayers=new Set(events.map((e: any) =>e.player_id as string|null).filter(Boolean)).size;
  const sessions=events.filter((e: any) =>e.event_name==="session_started").length;
  const dailyStarted=events.filter((e: any) =>e.event_name==="daily_started").length;
  const dailyCompleted=events.filter((e: any) =>e.event_name==="daily_completed").length;
  const eliminated=events.filter((e: any) =>e.event_name==="player_eliminated").length;

  async function retention(daysAgo:number){
    const cohortStart=plusDays(today,-daysAgo),cohortEnd=plusDays(cohortStart,1);
    const {data:cohort}=await supabase.from("players").select("id").gte("created_at",cohortStart.toISOString()).lt("created_at",cohortEnd.toISOString()).limit(5000);
    const ids=((cohort??[]) as IdRow[]).map((p: any) =>String(p.id)); if(!ids.length)return{cohort:0,returned:0,rate:null as number|null};
    const returnStart=today,returnEnd=tomorrow;
    const {data:returns}=await supabase.from("analytics_events").select("player_id").eq("event_name","session_started").in("player_id",ids).gte("occurred_at",returnStart.toISOString()).lt("occurred_at",returnEnd.toISOString()).limit(10000);
    const returned=new Set(((returns??[]) as ReturnRow[]).map((r: any) =>String(r.player_id))).size;return{cohort:ids.length,returned,rate:Number(((returned/ids.length)*100).toFixed(1))};
  }
  const [d1,d7]=await Promise.all([retention(1),retention(7)]);

  return NextResponse.json({status:"ok",today:{
    newPlayers:newPlayersQ.count??0,officialAttempts:attemptsQ.count??0,completedAttempts:completedQ.count??0,
    practiceAttempts:practiceQ.count??0,activePlayers,sessions,dailyStarted,dailyCompleted,eliminated,
    completionRate:dailyStarted?Number((dailyCompleted/dailyStarted*100).toFixed(1)):0,
  },retention:{d1,d7},generatedAt:new Date().toISOString()});
}
