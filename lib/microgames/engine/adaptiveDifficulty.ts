"use client";

import type { MicrogameConfig } from "./types";
import { getPracticeStats } from "./personalBests";

const STATS_KEYS: Record<string,{key:string;direction:"lower_is_better"|"higher_is_better"}> = {
  react:{key:"react",direction:"lower_is_better"}, stop:{key:"stop",direction:"lower_is_better"}, exact:{key:"exact",direction:"lower_is_better"}, centre:{key:"centre",direction:"lower_is_better"}, half:{key:"half",direction:"lower_is_better"}, bigger:{key:"bigger",direction:"lower_is_better"},
  "memory-grid":{key:"memory-grid-performance",direction:"higher_is_better"}, count:{key:"count-performance",direction:"higher_is_better"}, "dont-tap":{key:"dont-tap-performance",direction:"higher_is_better"}, trace:{key:"trace-performance",direction:"higher_is_better"},
};

export function getPracticeLevel(microgameId:string): number {
  if (typeof window === "undefined") return 1;
  const s=STATS_KEYS[microgameId]; if(!s) return 1;
  const attempts=getPracticeStats(s.key,s.direction).attemptCount;
  return Math.min(10,1+Math.floor(attempts/3));
}

export function getAdaptivePracticeConfig(base:MicrogameConfig): MicrogameConfig {
  const level=getPracticeLevel(base.microgameId); const d={...base.difficulty}; const t=(level-1)/9;
  switch(base.microgameId){
    case "react": d.minDelayMs=900; d.maxDelayMs=Math.round(3000-900*t); break;
    case "stop": d.hideAfterSeconds=Math.max(0.25,2.2-2*t); d.target=Number((4.2+level*.317).toFixed(3)); break;
    case "exact": d.hideAfterMs=Math.max(150,850-700*t); d.targetSeconds=Number((2.2+level*.271).toFixed(3)); break;
    case "centre": d.timeLimitMs=Math.round(1800-700*t); d.pointCount=Math.round(6+4*t); break;
    case "half": d.timeLimitMs=Math.round(1600-600*t); break;
    case "bigger": d.timeLimitMs=Math.round(800-300*t); d.sizeDifferencePct=Number((.12-.105*t).toFixed(3)); break;
    case "memory-grid": d.gridSize=level<5?4:level<9?5:6; d.patternLength=Math.min((d.gridSize as number)**2-1,4+Math.floor(level*.8)); d.showMs=Math.round(1050-550*t); d.answerDeadlineMs=Math.round(5000-2000*t); break;
    case "count": d.showMs=Math.round(950-450*t); d.minCount=5+Math.floor(level*.7); d.maxCount=10+level; d.answerDeadlineMs=Math.round(3000-1000*t); break;
    case "dont-tap": d.responseWindowMs=500; d.minDelayMs=200; d.maxDelayMs=Math.round(600-200*t); d.trialCount=8; break;
    case "trace": d.accuracyThresholdPct=Math.round(90+7*t); d.timeLimitMs=Math.round(10000-3500*t); break;
  }
  return {...base,difficulty:d};
}
