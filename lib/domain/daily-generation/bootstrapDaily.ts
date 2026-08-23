// Daily round definitions for the public beta. All 10 games are eligible for
// the official run. Challenge-answer fields are generated here on the server
// and stored in daily_rounds.difficulty_config; the score route always reloads
// that server copy and never accepts a client-supplied answer/config.

export type DailyGameSlug = "react" | "stop" | "exact" | "centre" | "half" | "bigger" | "memory-grid" | "count" | "dont-tap" | "trace";

export interface BootstrapRoundDefinition {
  roundNumber: number;
  microgameId: DailyGameSlug;
  difficultyConfig: Record<string, number>;
  targetSurvivalPct: number;
  bootstrapCutoffValue: number;
  practiceLevel: number;
}

const BASE_ORDER: DailyGameSlug[] = ["react","bigger","half","centre","stop","exact","count","memory-grid","dont-tap","trace"];
const TARGET_SURVIVAL = [0.75,0.60,0.45,0.30,0.20,0.10,0.05,0.03,0.02,0.01];

function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i=0;i<input.length;i++) { h ^= input.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
function rng(seed: number) { let x=seed||123456789; return () => { x ^= x<<13; x ^= x>>>17; x ^= x<<5; return (x>>>0)/4294967296; }; }
function between(r:()=>number,min:number,max:number){ return min+r()*(max-min); }
function shuffled<T>(items:T[], r:()=>number):T[]{ const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j]!,a[i]!];} return a; }

function polygonConfig(r:()=>number, pointCount:number):Record<string,number>{
  const out:Record<string,number>={pointCount}; const baseRadius=.32;
  for(let i=0;i<pointCount;i++){const angle=(i/pointCount)*Math.PI*2+between(r,0,.28);const radius=baseRadius*between(r,.58,1.35);out[`p${i}x`]=.5+Math.cos(angle)*radius;out[`p${i}y`]=.5+Math.sin(angle)*radius;}
  return out;
}
function memoryPattern(r:()=>number,gridSize:number,length:number):Record<string,number>{
  const cells=Array.from({length:gridSize*gridSize},(_,i)=>i); const shuffledCells=shuffled(cells,r); const out:Record<string,number>={gridSize,patternLength:length}; for(let i=0;i<length;i++) out[`pattern${i}`]=shuffledCells[i]!; return out;
}
function nopeSequence(r:()=>number,count:number):Record<string,number>{
  const out:Record<string,number>={trialCount:count}; let last=-1,streak=0;
  for(let i=0;i<count;i++){let v=r()<.5?0:1;if(v===last&&streak>=1)v=1-v;streak=v===last?streak+1:0;last=v;out[`trial${i}IsGo`]=v;} return out;
}

function configFor(slug:DailyGameSlug, level:number, r:()=>number):Record<string,number>{
  const t=(level-1)/9;
  switch(slug){
    case "react": { const stimulusDelayMs=Math.round(between(r,900,2600)); return {minDelayMs:900,maxDelayMs:2600,stimulusDelayMs}; }
    case "stop": return {target:Number(between(r,4.1,7.8).toFixed(3)),speed:1,hideAfterSeconds:Number(Math.max(.2,1.6-1.3*t).toFixed(2))};
    case "exact": return {targetSeconds:Number(between(r,2.2,5.2).toFixed(3)),hideAfterMs:Math.round(Math.max(120,650-500*t))};
    case "centre": return {...polygonConfig(r,6+Math.floor(4*t)),timeLimitMs:Math.round(1700-700*t)};
    case "half": { const length=between(r,.32,.7); const start=between(r,.04,.96-length); return {lineStartX:start,lineEndX:start+length,timeLimitMs:Math.round(1400-500*t)}; }
    case "bigger": return {biggerSide:r()<.5?0:1,shapeKind:Math.floor(r()*3),sizeDifferencePct:Number((.08-.065*t).toFixed(3)),timeLimitMs:Math.round(650-150*t)};
    case "memory-grid": { const grid=level<5?4:level<8?5:6; const length=Math.min(grid*grid-1,4+Math.floor(level*.8)); const gridBonusMs=grid===4?0:grid===5?1000:2000; return {...memoryPattern(r,grid,length),showMs:Math.round(900-420*t),answerDeadlineMs:Math.round(4200-1600*t)+gridBonusMs}; }
    case "count": { const min=6+Math.floor(level*.6),max=10+level; return {minCount:min,maxCount:max,actualCount:Math.floor(between(r,min,max+1)),showMs:Math.round(800-350*t),answerDeadlineMs:Math.round(2600-700*t)}; }
    case "dont-tap": return {...nopeSequence(r,8),responseWindowMs:Math.round(480-130*t),minDelayMs:180,maxDelayMs:Math.round(520-180*t)};
    case "trace": return {targetRadius:Number(between(r,.25,.34).toFixed(3)),accuracyThresholdPct:Math.round(91+6*t),timeLimitMs:Math.round(9500-3000*t)};
  }
}

// Honest bootstrap thresholds. These are replaced by server-recorded practice
// calibration when enough samples exist for the corresponding game/level.
//
// Loosened from the original guesses after real playtesting showed round 1
// — supposedly the ~75%-survive round — was eliminating almost everyone on
// day one. Two compounding causes, both fixed here: (1) weekBase below was
// starting the WHOLE day at practice level 4-7 out of 10, never truly easy,
// even on the gentlest day of the week; (2) these base values themselves
// were picked closer to idealized/lab reaction times than real mixed-
// population performance on a touchscreen. Loosened roughly 35-45% across
// the board — still a guess, not real calibration data, but a deliberately
// generous one given the alternative is people getting cut round 1 every
// single day and never coming back.
const BASE_CUTOFF:Record<DailyGameSlug,number>={
  react:460, bigger:750, half:.115, centre:.13, stop:.25, exact:.28,
  count:9000, "memory-grid":10500, "dont-tap":3600, trace:9500,
};

export function getBootstrapRoundsForDate(dailyDate:string):BootstrapRoundDefinition[]{
  const day=new Date(`${dailyDate}T12:00:00Z`).getUTCDay(); // Sunday 0 ... Saturday 6
  const r=rng(hashString(dailyDate));
  // Was 4+floor(day/2), meaning even Sunday's opening round started at
  // practice level 4/10 — never actually easy. Now starts at level 1 on
  // Sunday, still capped well below max by Saturday.
  const weekBase=1+Math.floor(day/2);
  const order=shuffled(BASE_ORDER,r);
  return order.map((slug,index)=>{
    const roundNumber=index+1;
    const practiceLevel=Math.min(10,weekBase+Math.floor(index/3));
    const targetSurvivalPct=TARGET_SURVIVAL[index]!;
    const config=configFor(slug,practiceLevel,r);
    const weeklyTighten=1-day*.045;
    const roundTighten=1-index*.035;
    return { roundNumber,microgameId:slug,difficultyConfig:config,targetSurvivalPct,bootstrapCutoffValue:Number((BASE_CUTOFF[slug]*weeklyTighten*roundTighten).toFixed(5)),practiceLevel };
  });
}
