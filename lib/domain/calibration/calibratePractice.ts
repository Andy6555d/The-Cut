import { getSupabaseServerClient } from "@/lib/db/supabase-server";

const TARGETS=[.01,.02,.03,.05,.10,.20,.30,.45,.50,.60,.75,.90,.95,.99];
function quantile(sorted:number[],q:number){if(!sorted.length)return null;const pos=(sorted.length-1)*q;const lo=Math.floor(pos),hi=Math.ceil(pos);if(lo===hi)return sorted[lo]!;const w=pos-lo;return sorted[lo]!*(1-w)+sorted[hi]!*w;}

export async function calibratePractice(){
  const supabase=getSupabaseServerClient();const since=new Date(Date.now()-90*86400000).toISOString();
  const {data,error}=await supabase.from("practice_attempts").select("microgame_version_id,practice_level,raw_score,player_id").eq("failed",false).not("raw_score","is",null).gte("played_at",since).limit(50000);
  if(error)throw new Error(error.message);
  const groups=new Map<string,{versionId:string;level:number;scores:number[];players:Map<string,number>}>();
  for(const row of data??[]){const versionId=String(row.microgame_version_id??"");if(!versionId)continue;const level=Number(row.practice_level),score=Number(row.raw_score);if(!Number.isFinite(score))continue;const key=`${versionId}:${level}`;const g=groups.get(key)??{versionId,level,scores:[],players:new Map<string,number>()};const player=String(row.player_id??"");const used=g.players.get(player)??0;if(used>=30)continue;g.players.set(player,used+1);g.scores.push(score);groups.set(key,g);}
  let updated=0;
  for(const g of groups.values()){g.scores.sort((a: any, b: any) =>a-b);if(g.scores.length<50||g.players.size<5)continue;const q:Record<string,number>={};for(const t of TARGETS){const v=quantile(g.scores,t);if(v!==null)q[t.toFixed(2)]=v;}await supabase.from("practice_level_calibrations").upsert({microgame_version_id:g.versionId,practice_level:g.level,p01:q["0.01"],p05:q["0.05"],p10:q["0.10"],p25:quantile(g.scores,.25),p50:q["0.50"],p75:q["0.75"],p90:q["0.90"],p95:q["0.95"],p99:q["0.99"],quantiles:q,sample_count:g.scores.length,computed_at:new Date().toISOString()},{onConflict:"microgame_version_id,practice_level"});updated++;}
  return{groupsUpdated:updated,samples:(data??[]).length};
}
