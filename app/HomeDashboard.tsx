"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Countdown } from "@/lib/microgames/engine/Countdown";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon, InfoIcon } from "@/lib/microgames/engine/NavIcons";
import { getPracticeStats } from "@/lib/microgames/engine/personalBests";
import { localWeeklyPressure } from "@/lib/domain/daily-generation/weeklyPressure";
import { HomeNamePopup } from "@/lib/microgames/engine/HomeNamePopup";
import { HowToPlayPopup } from "@/lib/microgames/engine/HowToPlayPopup";

const PRACTICE_KEYS=[
  {key:"react",dir:"lower_is_better" as const},{key:"stop",dir:"lower_is_better" as const},{key:"exact",dir:"lower_is_better" as const},{key:"centre",dir:"lower_is_better" as const},{key:"half",dir:"lower_is_better" as const},{key:"bigger",dir:"lower_is_better" as const},
  {key:"memory-grid-performance",dir:"higher_is_better" as const},{key:"count-performance",dir:"higher_is_better" as const},{key:"dont-tap-performance",dir:"higher_is_better" as const},{key:"trace-performance",dir:"higher_is_better" as const},
];

export function HomeDashboard(){const[ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);const stats=useMemo(()=>ready?PRACTICE_KEYS.map(x=>getPracticeStats(x.key,x.dir)):[],[ready]);const totalPractice=stats.reduce((s,x)=>s+x.attemptCount,0);const trained=stats.filter(x=>x.attemptCount>0).length;
 const [howToSeen, setHowToSeen] = useState(false);
 const pressure=localWeeklyPressure();
 return <main className="home-shell">{!howToSeen ? <HowToPlayPopup onDismiss={() => setHowToSeen(true)} /> : <HomeNamePopup/>}<Link href="/how-to-play" className="howto-help-chip" aria-label="How to play"><InfoIcon size={18}/></Link><div className="ambient-orb orb-one"/><div className="ambient-orb orb-two"/><section className="home-hero"><div className="home-eyebrow"><span className="live-dot"/> WORLD DAILY · ONE SHOT · RESETS AT YOUR MIDNIGHT</div><h1 className="brand-lockup"><span>THE</span><strong>CUT</strong></h1><p className="home-tagline">TRAIN ANYTIME. COMPETE ONCE.<br/><b>HOW FAR CAN YOU GO?</b></p><div className="world-ring" aria-hidden="true"><div className="world-ring-inner">✦</div></div><div className="weekly-pressure-banner"><strong>{pressure.day} · {pressure.tier}</strong><span>{pressure.note} Resets Sunday at your midnight.</span></div><div className="countdown-card"><span>YOUR NEXT CUT IN</span><Countdown/></div><Link href="/daily" className="hero-cta">PLAY TODAY&apos;S CUT <span>→</span></Link><div className="home-mode-row"><Link href="/practice" className="practice-cta">◎ PRACTICE</Link><Link href="/practice/quick" className="practice-cta quick-cta">⚄ QUICK PLAY</Link></div></section>
 <section className="home-stats"><div><span>PRACTICE PLAYS</span><strong>{totalPractice}</strong></div><div><span>GAMES TRAINED</span><strong>{trained}/10</strong></div><div><span>MISSION</span><strong>TOP 1%</strong></div></section>
 <section className="home-loop-card"><span>THE LOOP</span><div><b>1</b><p><strong>TRAIN</strong><small>Set permanent PBs.</small></p></div><i>→</i><div><b>2</b><p><strong>DAILY</strong><small>Compare with the world.</small></p></div><i>→</i><div><b>3</b><p><strong>THE CUT</strong><small>One life. Survive.</small></p></div></section>
 <Link href="/practice" className="home-challenge-card"><div><span className="mini-kicker">PRACTICE NEVER CLOSES</span><h2>ONE MORE GO.</h2><p>Every replay can beat a PB and sharpen tomorrow&apos;s Daily.</p></div><div className="challenge-bolt">ϟ</div></Link>
 <nav className="bottom-nav" aria-label="Primary navigation"><Link href="/" className="active"><HomeIcon/><span>HOME</span></Link><Link href="/practice"><TargetIcon/><span>PRACTICE</span></Link><Link href="/daily"><BoltIcon/><span>DAILY</span></Link><Link href="/leaderboard"><RanksIcon/><span>RANKS</span></Link><Link href="/leagues"><LeaguesIcon/><span>LEAGUES</span></Link></nav></main>;
}
