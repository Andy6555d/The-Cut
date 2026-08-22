"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPracticeStats } from "@/lib/microgames/engine/personalBests";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon } from "@/lib/microgames/engine/NavIcons";

type PracticeGame = { slug:string; statsKey?:string; direction?:"lower_is_better"|"higher_is_better"; name:string; icon:string; tone:string; category:string; blurb:string; fmt:(n:number)=>string };

const GAMES: PracticeGame[] = [
  { slug:"react", name:"SNAP", icon:"ϟ", tone:"violet", category:"Reaction", blurb:"Tap the instant it flashes.", fmt:n=>`${Math.round(n)}ms` },
  { slug:"stop", name:"STOP", icon:"◉", tone:"pink", category:"Timing", blurb:"Stop dead on the target.", fmt:n=>`${n.toFixed(3)}s` },
  { slug:"exact", name:"ZERO", icon:"⌾", tone:"gold", category:"Timing", blurb:"Hold until your error hits zero.", fmt:n=>`${n.toFixed(3)}s` },
  { slug:"centre", name:"CORE", icon:"⌖", tone:"cyan", category:"Precision + speed", blurb:"Find the exact centre of the shape.", fmt:n=>`${(n*100).toFixed(1)}%` },
  { slug:"half", name:"HALF", icon:"┼", tone:"gold", category:"Estimation + speed", blurb:"Split it exactly in two.", fmt:n=>`${(n*100).toFixed(1)}%` },
  { slug:"bigger", name:"MORE", icon:"○●", tone:"green", category:"Visual · adaptive", blurb:"Starts fast. Gets vicious. At Level 10 you get just 0.5 seconds.", fmt:n=>`${Math.round(n)}ms` },
  { slug:"memory-grid", statsKey:"memory-grid-performance", direction:"higher_is_better", name:"FLASH", icon:"▦", tone:"blue", category:"Memory + speed", blurb:"See it once. Rebuild it fast.", fmt:n=>`${Math.round(n)}/1000` },
  { slug:"count", statsKey:"count-performance", direction:"higher_is_better", name:"COUNT", icon:"8", tone:"orange", category:"Count + 5s clock", blurb:"Count the flash. Five seconds to answer.", fmt:n=>`${Math.round(n)}/1000` },
  { slug:"dont-tap", statsKey:"dont-tap-performance", direction:"higher_is_better", name:"NOPE", icon:"×", tone:"red", category:"Control", blurb:"Tap only when the rule says go.", fmt:n=>`${Math.round(n)}/1000` },
  { slug:"trace", statsKey:"trace-performance", direction:"higher_is_better", name:"TRACE", icon:"∿", tone:"pink", category:"90%+ · 10s clock", blurb:"Clear 90% accuracy before time dies.", fmt:n=>`${Math.round(n)}/1000` },
];

export function PracticeHub() {
  const [stamp,setStamp]=useState(0); useEffect(()=>setStamp(Date.now()),[]); const mounted=stamp>0;
  const entries=useMemo(()=>mounted?GAMES.map(g=>({g,stats:getPracticeStats(g.statsKey??g.slug,g.direction??"lower_is_better")})):[],[mounted,stamp]);
  const total=entries.reduce((s,x)=>s+x.stats.attemptCount,0); const trained=entries.filter(x=>x.stats.attemptCount>0).length;
  const hot=entries.filter(x=>x.stats.best!==null).sort((a,b)=>b.stats.attemptCount-a.stats.attemptCount)[0];
  const pbGames=entries.filter(x=>x.stats.best!==null).length;
  return <main className="practice-hub" data-ready={stamp?"yes":"no"}>
    <div className="practice-hub-glow" />
    <header className="practice-header"><Link href="/" className="back-chip">←</Link><div><span>PRACTICE</span><h1>BEAT YOURSELF.</h1></div><div className="practice-count">{total}<small>PLAYS</small></div></header>
    <section className="practice-feature"><div className="feature-icon">⚡</div><div><span>UNLIMITED · ADAPTIVE TRAINING</span><strong>{hot?`${hot.g.name} IS YOUR HOT GAME`:"START YOUR FIRST PB"}</strong><p>{hot?`${hot.stats.attemptCount} goes logged. One more could move the line.`:"Every 3 completed runs raises the level. Practice gets harder as you improve, while PBs stay permanent."}</p></div><div className="sparkline">⌁↗</div></section>
    <section className="practice-mini-stats"><div><span>GAMES TRAINED</span><strong>{trained}/10</strong></div><div><span>PB BOARDS</span><strong>{pbGames}</strong></div><div><span>NEXT TARGET</span><strong>TOP 1%</strong></div></section>
    <Link href="/practice/quick" className="gauntlet-card gauntlet-primary"><span>⚄</span><div><strong>QUICK PLAY</strong><small>Random games. No stopping. Chase PBs.</small></div><b>→</b></Link>
    <div className="section-title"><span>10 SKILL GAMES</span><small>Accuracy. Speed. Control. Repeat.</small></div>
    <section className="game-grid">{GAMES.map(g=>{const stats=mounted?getPracticeStats(g.statsKey??g.slug,g.direction??"lower_is_better"):{best:null,average:null,todayAverage:null,attemptCount:0};return <Link key={g.slug} href={`/practice/${g.slug}`} className={`arcade-card tone-${g.tone}`}><div className="arcade-icon">{g.icon}</div><div className="arcade-copy"><strong>{g.name}</strong><span>{g.category}</span><p>{g.blurb}</p></div><div className="arcade-best"><small>{stats.best===null?"NEW":"PB"}</small><b>{stats.best===null?"PLAY":g.fmt(stats.best)}</b></div></Link>})}</section>
    <nav className="bottom-nav" aria-label="Primary navigation"><Link href="/"><HomeIcon/><span>HOME</span></Link><Link href="/practice" className="active"><TargetIcon/><span>PRACTICE</span></Link><Link href="/daily"><BoltIcon/><span>DAILY</span></Link><Link href="/leaderboard"><RanksIcon/><span>RANKS</span></Link><Link href="/leagues"><LeaguesIcon/><span>LEAGUES</span></Link></nav>
  </main>;
}
