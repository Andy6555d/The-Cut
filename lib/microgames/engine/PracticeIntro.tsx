"use client";

import type { CSSProperties } from "react";

const TONES: Record<string,string> = {
  SNAP:"#b467ff", STOP:"#ff3f79", ZERO:"#ffc327", CORE:"#15dcec", HALF:"#ffc327", MORE:"#55ef46",
  FLASH:"#1ea7ff", COUNT:"#ff941a", NOPE:"#ff4c5f", TRACE:"#ff3f79",
};

export function PracticeIntro({ title, instructions, onStart, level=1 }: { title:string; instructions:string; onStart:()=>void; level?:number }) {
  const tone = TONES[title] ?? "#00e5a0";
  return (
    <div className="practice-intro-screen" style={{ "--game-tone": tone } as CSSProperties}>
      <div className="practice-orbit" aria-hidden="true"><span /></div>
      <div className="practice-intro-card">
        <p className="game-instruction intro-mode">PRACTICE MODE</p>
        <h1 className="game-headline practice-title">{title}</h1>
        <p className="practice-instructions">{instructions}</p>
        <div className="difficulty-banner"><span>TRAINING LEVEL</span><strong>{level}/10</strong><small>{level < 4 ? "WARMING UP" : level < 7 ? "GETTING HARD" : level < 10 ? "ELITE PRESSURE" : "MAX LEVEL"}</small></div>
        <div className="practice-tip">⚡ Instant scoring · PB chasing · unlimited replays</div>
        <button onPointerDown={onStart} className="big-tap-button practice-start themed-start">START</button>
        <a href="/practice" className="intro-back">← ALL GAMES</a>
      </div>
    </div>
  );
}
