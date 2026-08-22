"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
const GAMES=["react","stop","exact","centre","half","bigger","memory-grid","count","dont-tap","trace"];
export default function QuickPlayPage(){const router=useRouter();useEffect(()=>{const next=GAMES[Math.floor(Math.random()*GAMES.length)]??"stop";router.replace(`/practice/${next}`)},[router]);return <main className="home-shell" style={{display:"grid",placeItems:"center"}}><div style={{textAlign:"center"}}><p className="home-eyebrow">QUICK PLAY</p><h1 className="game-headline">DEALING A GAME…</h1></div></main>}
