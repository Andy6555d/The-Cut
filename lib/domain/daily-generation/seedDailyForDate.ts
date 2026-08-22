import { getSupabaseServerClient } from "@/lib/db/supabase-server";
import { getBootstrapRoundsForDate, type DailyGameSlug } from "@/lib/domain/daily-generation/bootstrapDaily";

export interface SeedResult { ok:boolean; status:string; dailyId?:string; dailyDate:string; weeklyPressureDay?:number; error?:string; detail?:string; }

const CATEGORY:Record<DailyGameSlug,string>={react:"reaction",stop:"timing",exact:"timing",centre:"precision",half:"estimation",bigger:"visual","memory-grid":"memory",count:"visual","dont-tap":"inhibition",trace:"coordination"};

function nearestQuantile(quantiles:Record<string,unknown>|null,target:number):number|null{
  if(!quantiles)return null;let best:number|null=null,bestGap=Infinity;
  for(const [k,v] of Object.entries(quantiles)){const q=Number(k),n=Number(v);if(!Number.isFinite(q)||!Number.isFinite(n))continue;const gap=Math.abs(q-target);if(gap<bestGap){bestGap=gap;best=n;}}
  return best;
}

export async function seedDailyForDate(dailyDate:string):Promise<SeedResult>{
  const supabase=getSupabaseServerClient();
  const {data:existing}=await supabase.from("dailies").select("id,status,version").eq("daily_date",dailyDate).maybeSingle();
  if(existing){
    if(Number(existing.version??1)>=2)return{ok:true,status:"already_exists",dailyDate,dailyId:String(existing.id)};
    const existingId=String(existing.id);
    const {count}=await supabase.from("attempts").select("id",{count:"exact",head:true}).eq("daily_id",existingId);
    if((count??0)>0)return{ok:true,status:"existing_v1_preserved_has_attempts",dailyDate,dailyId:existingId};
    // Safe upgrade path for previously pre-seeded but untouched beta Dailies.
    await supabase.from("live_round_counts").delete().eq("daily_id",existingId);
    await supabase.from("cutoffs").delete().eq("daily_id",existingId);
    await supabase.from("daily_rounds").delete().eq("daily_id",existingId);
    await supabase.from("dailies").delete().eq("id",existingId);
  }

  const rounds=getBootstrapRoundsForDate(dailyDate); const versionIdByGame:Record<string,string>={}; const disabled=new Set<string>();
  const slugs: DailyGameSlug[] = [...new Set(rounds.map((r) => r.microgameId))];
  for(const slug of slugs){
    let {data:game}=await supabase.from("microgames").select("id,enabled").eq("slug",slug).maybeSingle();
    if(!game){const ins=await supabase.from("microgames").insert({slug,category:CATEGORY[slug]}).select("id,enabled").single();if(ins.error||!ins.data)return{ok:false,status:"error",dailyDate,error:"microgame_seed_failed",detail:ins.error?.message};game=ins.data;}
    if(game?.enabled===false){disabled.add(slug);continue;}
    let {data:version}=await supabase.from("microgame_versions").select("id").eq("microgame_id",String(game.id)).eq("version",1).maybeSingle();
    if(!version){const ins=await supabase.from("microgame_versions").insert({microgame_id:String(game.id),version:1,calibration_status:"ready"}).select("id").single();if(ins.error||!ins.data)return{ok:false,status:"error",dailyDate,error:"version_seed_failed",detail:ins.error?.message};version=ins.data;}
    versionIdByGame[slug]=String(version.id);
  }

  const seed=Math.floor(Math.random()*Number.MAX_SAFE_INTEGER);
  const {data:daily,error:dailyError}=await supabase.from("dailies").insert({daily_date:dailyDate,seed,status:"draft",version:2}).select("id").single();
  if(dailyError||!daily)return{ok:false,status:"error",dailyDate,error:"daily_seed_failed",detail:dailyError?.message};
  const dailyId=String(daily.id);

  const activeRounds=rounds.filter((r) => !disabled.has(r.microgameId)).map((r, i) => ({...r,roundNumber:i+1}));
  if(activeRounds.length<3)return{ok:false,status:"error",dailyDate,error:"too_few_enabled_games"};
  for(const round of activeRounds){
    const versionId=versionIdByGame[round.microgameId]; if(!versionId)return{ok:false,status:"error",dailyDate,error:"missing_version",detail:round.microgameId};
    const {data:cal}=await supabase.from("practice_level_calibrations").select("quantiles,sample_count").eq("microgame_version_id",versionId).eq("practice_level",round.practiceLevel).maybeSingle();
    const calibrated=(cal&&Number(cal.sample_count)>=50)?nearestQuantile((cal.quantiles as Record<string,unknown>)??{},round.targetSurvivalPct):null;
    const cutoff=calibrated??round.bootstrapCutoffValue; const source=calibrated!=null?"calibration_pool":"bootstrap_default";

    const {error:rErr}=await supabase.from("daily_rounds").insert({daily_id:dailyId,round_number:round.roundNumber,microgame_version_id:versionId,difficulty_config:{...round.difficultyConfig,practiceLevel:round.practiceLevel},target_survival_pct:round.targetSurvivalPct});
    if(rErr)return{ok:false,status:"error",dailyDate,error:"round_seed_failed",detail:rErr.message};
    await supabase.from("difficulty_calibrations").insert({microgame_version_id:versionId,difficulty_config:round.difficultyConfig,target_survival_pct:round.targetSurvivalPct,computed_cutoff_value:cutoff,sample_count:Number(cal?.sample_count??0),source:calibrated!=null?"practice_pool":"bootstrap_default"});
    const {error:cErr}=await supabase.from("cutoffs").insert({daily_id:dailyId,round_number:round.roundNumber,cutoff_value:cutoff,target_survival_pct:round.targetSurvivalPct,source});
    if(cErr)return{ok:false,status:"error",dailyDate,error:"cutoff_seed_failed",detail:cErr.message};
  }

  const {error:publishError}=await supabase.from("dailies").update({status:"live",published_at:new Date().toISOString()}).eq("id",dailyId);
  if(publishError)return{ok:false,status:"error",dailyDate,error:"publish_failed",detail:publishError.message};
  return{ok:true,status:"created_and_published",dailyId,dailyDate,weeklyPressureDay:new Date(`${dailyDate}T12:00:00Z`).getUTCDay()};
}
