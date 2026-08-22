"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DisplayNamePrompt } from "@/lib/microgames/engine/DisplayNamePrompt";
import { HomeIcon, TargetIcon, BoltIcon, RanksIcon, LeaguesIcon } from "@/lib/microgames/engine/NavIcons";

interface LeaderboardEntry {
  worldRank: number;
  roundsSurvived: number;
  finalPercentile: number;
  handle: string;
}

type LoadState = "loading" | "empty" | "ready" | "error";

export default function LeaderboardPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [dailyDate, setDailyDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.status !== "ok") {
          setState("empty");
          return;
        }
        setEntries(data.entries ?? []);
        setDailyDate(data.dailyDate ?? null);
        setState((data.entries ?? []).length === 0 ? "empty" : "ready");
      })
      .catch(() => setState("error"));
  }, []);

  return (
    <main className="ranked-shell">
      <div className="ranked-glow" />

      <div className="ranked-header">
        <Link href="/" className="back-chip" aria-label="Back">
          ←
        </Link>
        <span>WORLDWIDE</span>
        <h1>Leaderboard</h1>
      </div>

      <div className="ranked-subrow">
        <DisplayNamePrompt />
        {dailyDate && <span className="ranked-date">{dailyDate}</span>}
      </div>

      {state === "loading" && (
        <div className="ranked-skeleton">
          <div className="ranked-skeleton-row" />
          <div className="ranked-skeleton-row" />
          <div className="ranked-skeleton-row" />
          <div className="ranked-skeleton-row" />
        </div>
      )}

      {state === "empty" && (
        <div className="ranked-empty">
          <p>No closed Daily to rank yet. Check back after today's run ends.</p>
        </div>
      )}

      {state === "error" && (
        <div className="ranked-error">
          <p>Couldn't load the leaderboard. Try again in a moment.</p>
        </div>
      )}

      {state === "ready" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {entries.map((entry) => (
            <div key={entry.worldRank + entry.handle} className={`ranked-row ${entry.worldRank === 1 ? "ranked-row-first" : ""}`}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.85rem", minWidth: 0 }}>
                <span className="ranked-rank">#{entry.worldRank}</span>
                <span className="ranked-handle">{entry.handle}</span>
              </span>
              <span className="ranked-meta">
                {entry.roundsSurvived} rounds · top {Math.max(0.1, 100 - entry.finalPercentile).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="ranked-cta-row">
        <Link href="/daily" className="big-tap-button" style={{ textDecoration: "none" }}>
          PLAY TODAY'S CUT
        </Link>
      </div>

      <nav className="bottom-nav" aria-label="Primary navigation">
        <Link href="/"><HomeIcon/><span>HOME</span></Link>
        <Link href="/practice"><TargetIcon/><span>PRACTICE</span></Link>
        <Link href="/daily"><BoltIcon/><span>DAILY</span></Link>
        <Link href="/leaderboard" className="active"><RanksIcon/><span>RANKS</span></Link>
        <Link href="/leagues"><LeaguesIcon/><span>LEAGUES</span></Link>
      </nav>
    </main>
  );
}
